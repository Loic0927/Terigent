import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { hasValidOrigin } from './auth.js';
import { send } from './http.js';
import { hashSessionToken, readUserToken } from './user-auth.js';
import { parseDocumentUpload } from './document-multipart.js';
import { validateDocumentFile } from './document-validation.js';

const validId=value=>/^[1-9]\d*$/.test(String(value||''));
const safeName=name=>name.replace(/["\\\r\n]/g,'_').replace(/[^\x20-\x7e]/g,'_').slice(0,180)||'document';
const encodedName=name=>encodeURIComponent(name).replace(/[!'()*]/g,character=>`%${character.charCodeAt(0).toString(16).toUpperCase()}`);
const privateHeaders=res=>{res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');};
const logError=(label,error)=>console.error(label,error instanceof Error?error.message:'Unknown error');

export function createDocumentsHandler(repository, authRepository, blobs, parseUpload=parseDocumentUpload) {
  return async function documents(req,res) {
    privateHeaders(res);
    const token=readUserToken(req); let user;
    try { user=token?await authRepository.findSession(hashSessionToken(token)):null; }
    catch(error){logError('Document authentication failed:',error);return send(res,500,{error:'Documents are temporarily unavailable.'});}
    if(!user)return send(res,401,{error:'Not authenticated.'});
    const route=String(req.query?.documentRoute||'index'); const id=Array.isArray(req.query?.id)?req.query.id[0]:req.query?.id;
    if(route==='index'&&req.method==='GET'){
      const raw=Array.isArray(req.query?.cursor)?null:req.query?.cursor; const cursor=raw?repository.decodeCursor(raw):null;
      if(raw&&!cursor)return send(res,400,{error:'Invalid pagination cursor.'});
      try{if(repository.listCleanupNeeded){for(const stale of await repository.listCleanupNeeded(user.id)){try{await blobs.deleteBlob(stale.storageKey);await repository.removeReservation(user.id,stale.id);}catch(error){logError('Document cleanup retry failed:',error);}}}return send(res,200,await repository.listDocuments(user.id,cursor,10));}catch(error){logError('Document list failed:',error);return send(res,500,{error:'Documents could not be loaded.'});}
    }
    if(route==='index'&&req.method==='POST'){
      if(!hasValidOrigin(req))return send(res,403,{error:'Request origin could not be verified.'});
      const parsed=await parseUpload(req);if(parsed.error)return send(res,parsed.status||400,{error:parsed.error});
      const checked=await validateDocumentFile(parsed.file);if(checked.error)return send(res,checked.error==='File too large.'?413:400,{error:checked.error});
      const extension=checked.data.filename.toLowerCase().endsWith('.pdf')?'.pdf':checked.data.mimeType==='image/png'?'.png':checked.data.mimeType==='image/webp'?'.webp':'.jpg';
      const storageKey=`documents/${randomUUID()}${extension}`;let reserved;
      try { reserved=await repository.reserveUpload(user.id,checked.data,storageKey); }
      catch(error){logError('Document reservation failed:',error);return send(res,500,{error:'Upload failed.'});}
      if(reserved.rateLimited)return send(res,429,{error:'Too many uploads. Try again in 15 minutes.'});
      if(reserved.limitReached)return send(res,409,{error:'Document limit reached.'});
      try {
        await blobs.uploadBlob(storageKey,checked.data.buffer,checked.data.mimeType);
        const document=await repository.markReady(user.id,reserved.document.id);
        if(!document)throw new Error('Metadata finalization failed');
        return send(res,201,{message:'Document uploaded.',document});
      } catch(error) {
        logError('Document upload failed:',error);
        try { await blobs.deleteBlob(storageKey); await repository.removeReservation(user.id,reserved.document.id); }
        catch(cleanupError){logError('Document upload compensation failed:',cleanupError);try{await repository.markCleanupNeeded(user.id,reserved.document.id);}catch(markError){logError('Document cleanup tracking failed:',markError);}}
        return send(res,500,{error:'Upload failed.'});
      }
    }
    if(['content','download','item'].includes(route)&&!validId(id))return send(res,404,{error:'Document not found.'});
    if((route==='content'||route==='download')&&req.method==='GET'){
      let document;try{document=await (repository.findReadyDocument||repository.findDocument)(user.id,id);}catch(error){logError('Document lookup failed:',error);return send(res,500,{error:route==='download'?'Download failed.':'Document could not be opened.'});}
      if(!document)return send(res,404,{error:'Document not found.'});
      if(route==='content'&&!document.mimeType.startsWith('image/'))return send(res,404,{error:'Document not found.'});
      try{const result=await blobs.getBlob(document.storageKey);if(!result||result.statusCode!==200)return send(res,404,{error:'Document not found.'});
        res.status(200);res.setHeader('Content-Type',document.mimeType);
        res.setHeader('Content-Disposition',`${route==='download'?'attachment':'inline'}; filename="${safeName(document.filename)}"; filename*=UTF-8''${encodedName(document.filename)}`);
        await pipeline(Readable.fromWeb(result.stream),res);return undefined;
      }catch(error){logError('Document delivery failed:',error);if(res.headersSent){res.destroy?.();return undefined;}return send(res,500,{error:route==='download'?'Download failed.':'Document could not be opened.'});}
    }
    if(route==='item'&&req.method==='DELETE'){
      if(!hasValidOrigin(req))return send(res,403,{error:'Request origin could not be verified.'});
      let document;try{document=await repository.findDocument(user.id,id);}catch(error){logError('Document lookup failed:',error);return send(res,500,{error:'Delete failed.'});}
      if(!document)return send(res,404,{error:'Document not found.'});
      try{await blobs.deleteBlob(document.storageKey);if(!await repository.finishDelete(user.id,id))return send(res,404,{error:'Document not found.'});return send(res,200,{message:'Document deleted.'});}
      catch(error){logError('Document deletion failed:',error);try{await repository.markDeleteFailed(user.id,id);}catch(markError){logError('Document delete tracking failed:',markError);}return send(res,500,{error:'Delete failed.'});}
    }
    res.setHeader('Allow',route==='index'?'GET, POST':route==='item'?'DELETE':'GET');return send(res,405,{error:'Method not allowed.'});
  };
}
