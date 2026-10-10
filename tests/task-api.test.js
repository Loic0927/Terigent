import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createTasksHandler,createTaskItemHandler } from '../server/task-handler.js';
import { taskUpdateParameters, taskUpdateSql } from '../server/task-repository.js';
import { hashSessionToken } from '../server/user-auth.js';
const headers={origin:'http://localhost',host:'localhost','x-forwarded-proto':'http'};
const response=()=>({statusCode:200,headers:{},setHeader(name,value){this.headers[name]=value;},status(code){this.statusCode=code;return this;},json(payload){this.payload=payload;return this;}});
const task={title:'Ship dashboard',description:'Protected work',status:'not-started',priority:'High',deadline:'2026-10-01',reminder:'No reminder',projectId:null,assigneeUserId:null};
function setup(){let sequence=0;const rows=[];const auth={async findSession(hash){if(hash===hashSessionToken('alice'))return{id:'1',name:'Alice',role:'user'};if(hash===hashSessionToken('bob'))return{id:'2',name:'Bob',role:'user'};return null;}};const repository={async listTasks(user){return rows.filter(row=>row.ownerId===user.id);},async listTaskOptions(){return{projects:[],staff:[]};},async createTask(user,data){const row={id:String(++sequence),ownerId:user.id,...data,attachments:[]};rows.push(row);return{task:row};},async updateTask(user,id,data){const index=rows.findIndex(row=>row.id===id&&row.ownerId===user.id);if(index<0)return null;rows[index]={...rows[index],...data};return{task:rows[index]};},async deleteTask(user,id){const index=rows.findIndex(row=>row.id===id&&row.ownerId===user.id);if(index<0)return null;return rows.splice(index,1)[0];}};return{rows,index:createTasksHandler(repository,auth),item:createTaskItemHandler(repository,auth)};}
async function call(handler,method,{token,body,id,origin=headers.origin}={}){const res=response();await handler({method,headers:{...headers,origin,...(token?{cookie:`terigent_user_session=${token}`}:{})},body,query:id?{id}:{},socket:{}},res);return res;}
test('task API requires a valid member session and never caches private data',async()=>{const api=setup();let res=await call(api.index,'GET');assert.equal(res.statusCode,401);assert.equal(res.headers['Cache-Control'],'private, no-store');res=await call(api.index,'GET',{token:'fake'});assert.equal(res.statusCode,401);});
test('members can persist and transition their own tasks while other members cannot access IDs',async()=>{const api=setup();let res=await call(api.index,'POST',{token:'alice',body:task});assert.equal(res.statusCode,201);const id=res.payload.task.id;res=await call(api.index,'GET',{token:'alice'});assert.equal(res.payload.tasks.length,1);res=await call(api.index,'GET',{token:'bob'});assert.equal(res.payload.tasks.length,0);res=await call(api.item,'PUT',{token:'bob',id,body:{...task,status:'completed'}});assert.equal(res.statusCode,404);res=await call(api.item,'PUT',{token:'alice',id,body:{...task,status:'in-progress'}});assert.equal(res.payload.task.status,'in-progress');res=await call(api.item,'PUT',{token:'alice',id,body:{...task,status:'completed'}});assert.equal(res.payload.task.status,'completed');res=await call(api.item,'PUT',{token:'alice',id,body:{...task,status:'not-started'}});assert.equal(res.payload.task.status,'not-started');res=await call(api.item,'DELETE',{token:'bob',id});assert.equal(res.statusCode,404);res=await call(api.item,'DELETE',{token:'alice',id});assert.equal(res.statusCode,200);assert.equal(api.rows.length,0);});
test('task mutations enforce origin, body whitelist and field validation',async()=>{const api=setup();let res=await call(api.index,'POST',{token:'alice',body:task,origin:'https://evil.example'});assert.equal(res.statusCode,403);res=await call(api.index,'POST',{token:'alice',body:{...task,userId:'2'}});assert.equal(res.statusCode,400);assert.ok(res.payload.errors.form);res=await call(api.index,'POST',{token:'alice',body:{...task,status:'admin'}});assert.equal(res.statusCode,400);});
test('missing production task table returns an actionable safe error',async()=>{const error=Object.assign(new Error('relation private.user_tasks does not exist'),{code:'42P01'});const repository={listTasks:async()=>{throw error;}};const auth={findSession:async()=>({id:'1'})};const res=await call(createTasksHandler(repository,auth),'GET',{token:'alice'});assert.equal(res.statusCode,500);assert.match(res.payload.error,/pending database migration/);assert.doesNotMatch(JSON.stringify(res.payload),/private|relation|42P01/);});

test('task options and CRUD receive the current database role rather than browser-supplied ownership',async()=>{
  const seen=[];const auth={findSession:async hash=>hash===hashSessionToken('staff')?{id:'7',role:'staff'}:hash===hashSessionToken('root')?{id:'9',role:'root'}:{id:'1',role:'user'}};
  const repository={listTaskOptions:async principal=>{seen.push(principal);return principal.role==='staff'?{projects:[{id:'4',name:'Assigned'}],staff:[{id:'7',projectId:'4',name:'Staff'}]}:{projects:[],staff:[]};},listTasks:async principal=>{seen.push(principal);return[];},createTask:async(principal,data)=>{seen.push(principal);return{task:{id:'1',ownerId:principal.id,...data}};}};
  let res=await call(createTasksHandler(repository,auth),'GET',{token:'staff'});assert.equal(res.statusCode,200);assert.deepEqual(res.payload.tasks,[]);
  const optionsRes=response();await createTasksHandler(repository,auth)({method:'GET',headers:{...headers,cookie:'terigent_user_session=staff'},query:{taskRoute:'options'},socket:{}},optionsRes);assert.equal(optionsRes.payload.projects[0].id,'4');
  res=await call(createTasksHandler(repository,auth),'POST',{token:'root',body:{...task,projectId:'4',assigneeUserId:'7'}});assert.equal(res.statusCode,201);assert.equal(seen.at(-1).role,'root');
  assert.ok(seen.every(principal=>['1','7','9'].includes(principal.id)));
});

test('task integration migration and repository enforce project and staff assignment scope',async()=>{
  const migration=await readFile(new URL('../db/migrations/013_integrate_tasks_projects_staff.sql',import.meta.url),'utf8');
  assert.match(migration,/project_id BIGINT REFERENCES projects\(id\) ON DELETE SET NULL/);
  assert.match(migration,/assignee_user_id BIGINT REFERENCES users\(id\) ON DELETE SET NULL/);
  const repository=await readFile(new URL('../server/task-repository.js',import.meta.url),'utf8');
  assert.match(repository,/project_members mine/);assert.match(repository,/principal\.role === 'staff'/);assert.match(repository,/u\.role='staff'/);assert.match(repository,/u\.deletion_state='active'/);
  assert.doesNotMatch(await readFile(new URL('../server/task-validation.js',import.meta.url),'utf8'),/['"]assignee['"]|['"]project['"]/);
});

test('task update SQL uses continuous placeholders with fields in bind order',()=>{
  const placeholders=[...taskUpdateSql.matchAll(/\$(\d+)/g)].map(match=>Number(match[1]));
  assert.deepEqual([...new Set(placeholders)].sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9]);
  assert.equal(Math.max(...placeholders),9);
  assert.match(taskUpdateSql,/title=\$2,description=\$3,status=\$4,priority=\$5,deadline=\$6,reminder=\$7,project_id=\$8,assignee_user_id=\$9/);
  const updated={...task,title:'Updated title',description:'Updated description',status:'in-progress',priority:'Low',deadline:'2026-11-15',reminder:'1 day before',projectId:'4',assigneeUserId:'7'};
  assert.deepEqual(taskUpdateParameters('12',updated),['12','Updated title','Updated description','in-progress','Low','2026-11-15','1 day before','4','7']);
  assert.doesNotMatch(taskUpdateSql,/\bproject\s*=\s*\$|\bassignee\s*=\s*\$/);
});
