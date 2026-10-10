import { chromium } from 'playwright-core';
import { preview } from 'vite';
import sharp from 'sharp';

const server=await preview({preview:{host:'127.0.0.1',port:4174}}),baseUrl=server.resolvedUrls.local[0].replace(/\/$/,'');
const source={create:{width:48,height:32,channels:3,background:{r:239,g:115,b:95}}};
const images={
  '1':{filename:'real-photo.jpg',mimeType:'image/jpeg',bytes:await sharp(source).jpeg().toBuffer()},
  '2':{filename:'real-image.png',mimeType:'image/png',bytes:await sharp(source).png().toBuffer()},
  '3':{filename:'real-picture.webp',mimeType:'image/webp',bytes:await sharp(source).webp().toBuffer()},
  '4':{filename:'retry-image.png',mimeType:'image/png',bytes:await sharp(source).png().toBuffer()},
};
const documents=Object.entries(images).map(([id,image])=>({id,filename:image.filename,mimeType:image.mimeType,sizeBytes:image.bytes.length,status:'ready',createdAt:'2026-10-03T00:00:00.000Z'}));
const tasks=[{id:'10',title:'Image preview test',description:'',status:'not-started',priority:'Medium',deadline:'2026-12-01',reminder:'No reminder',assignee:'',project:'',attachments:documents.slice(0,3)}];
const results=[];

async function verify(viewport){
 const page=await browser.newPage({viewport}),errors=[],requests=[],attempts=new Map();
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('Failed to load resource: the server responded with a status of 500'))errors.push(message.text());});
 await page.route('**/api/auth/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:'1',name:'Image Tester',email:'image@example.test',createdAt:'2026-01-01T00:00:00.000Z'}})}));
 await page.route('**/api/tasks',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({tasks})}));
 await page.route('**/api/documents',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({documents,nextCursor:null})}));
 for(const [id,image] of Object.entries(images))await page.route(`**/api/documents/${id}/content`,route=>{const request=route.request(),isFetch=request.resourceType()==='fetch',count=isFetch?(attempts.get(id)||0)+1:0;if(isFetch)attempts.set(id,count);requests.push({id,url:request.url(),method:request.method(),resourceType:request.resourceType()});if(id==='4'&&isFetch&&count===2)return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Preview failed.'})});return route.fulfill({status:200,contentType:image.mimeType,headers:{'Cache-Control':'private, no-store','Content-Disposition':'inline','X-Content-Type-Options':'nosniff'},body:image.bytes});});
 await page.goto(`${baseUrl}/dashboard`,{waitUntil:'networkidle'});
 const checkImage=async filename=>{const dialog=page.getByRole('dialog',{name:filename});await dialog.waitFor();const image=dialog.locator('img');await image.waitFor();const decoded=await image.evaluate(element=>({complete:element.complete,naturalWidth:element.naturalWidth,naturalHeight:element.naturalHeight,visible:Boolean(element.offsetWidth&&element.offsetHeight)}));if(!decoded.complete||decoded.naturalWidth<=0||decoded.naturalHeight<=0||!decoded.visible)errors.push(`${filename} did not visibly decode: ${JSON.stringify(decoded)}`);};
 for(const item of documents.slice(0,3)){const trigger=page.getByRole('button',{name:`Preview ${item.filename}`}).first();await trigger.click();await checkImage(item.filename);await page.keyboard.press('Escape');if(await page.getByRole('dialog',{name:item.filename}).count())errors.push(`${item.filename} did not close with Escape`);if(!await trigger.evaluate(element=>element===globalThis.document.activeElement))errors.push(`${item.filename} did not restore focus`);}
 const taskTrigger=page.getByRole('button',{name:'Preview real-photo.jpg'}).last();await taskTrigger.click();await checkImage('real-photo.jpg');await page.locator('.document-preview').click({position:{x:3,y:3}});if(await page.getByRole('dialog',{name:'real-photo.jpg'}).count())errors.push('Task preview did not close from backdrop');
 const retryTrigger=page.getByRole('button',{name:'Preview retry-image.png'}).last();await retryTrigger.click();await checkImage('retry-image.png');await page.keyboard.press('Escape');await retryTrigger.click();await page.locator('.notification-toast.error').filter({hasText:'Preview could not be loaded.'}).waitFor();await page.getByRole('button',{name:'Try again',exact:true}).click();await checkImage('retry-image.png');await page.getByRole('button',{name:'Close preview'}).click();
 if(!requests.every(request=>request.method==='GET'&&/\/api\/documents\/[1-4]\/content$/.test(new URL(request.url).pathname)))errors.push('A preview used an unexpected request URL or method.');
 if(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.document.documentElement.clientWidth))errors.push('Preview caused horizontal overflow.');
 results.push({viewport:`${viewport.width}x${viewport.height}`,formats:['jpeg','png','webp'],contentRequests:requests.length,errors});await page.close();
}

let browser;
try{browser=await chromium.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--disable-extensions']});await verify({width:1440,height:900});await verify({width:390,height:844});console.log(JSON.stringify(results,null,2));if(results.some(result=>result.errors.length))process.exitCode=1;}finally{await browser?.close();await server.close();}
