import { hasValidOrigin, isAdmin } from './auth.js';
import { clientIp, parseBody, send } from './http.js';
import { hashSessionToken, readUserToken } from './user-auth.js';
import { CUSTOMER_REQUEST_STATUSES, validateCustomerRequest, validateStatusUpdate } from './customer-request-validation.js';

const attempts = new Map();
function limited(ip, now = Date.now()) { const active=(attempts.get(ip)||[]).filter(t=>now-t<60_000); active.push(now); attempts.set(ip,active); if(attempts.size>1000)for(const [key,times] of attempts)if(!times.some(t=>now-t<60_000))attempts.delete(key); return active.length>5; }
const validId = value => /^(?:[1-9]\d*)$/.test(String(value || ''));
const isJson = req => String(req.headers?.['content-type'] || '').toLowerCase().split(';')[0].trim() === 'application/json';

export function createPublicCustomerRequestHandler(repository, rateLimit = limited) {
  return async (req,res) => {
    if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Method not allowed.'});}
    if(!isJson(req))return send(res,415,{error:'Content-Type must be application/json.'});
    if(rateLimit(clientIp(req)))return send(res,429,{error:'Too many requests. Please try again shortly.'});
    const parsed=parseBody(req,12_000);if(parsed.error)return send(res,parsed.error==='too_large'?413:400,{error:parsed.error==='too_large'?'Request is too large.':'Invalid request body.'});
    if(typeof parsed.body.website==='string'&&parsed.body.website.trim())return send(res,201,{message:'Your request has been received.'});
    const validation=validateCustomerRequest(parsed.body);if(!validation.valid)return send(res,400,{error:'Please correct the highlighted fields.',errors:validation.errors});
    try { const token=readUserToken(req); const userId=token?await repository.findUserIdBySession(hashSessionToken(token)):null; const item=await repository.createCustomerRequest({...validation.data,userId}); return send(res,201,{message:'Your service request has been received.',request:{id:item.id,status:item.status,createdAt:item.createdAt}}); }
    catch(error){console.error('Customer request creation failed:',error instanceof Error?error.message:'Unknown error');return send(res,500,{error:'Your request could not be submitted right now. Please try again later.'});}
  };
}
export function createAdminCustomerRequestsHandler(repository) {
  return async (req,res) => { if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{error:'Method not allowed.'});} if(!isAdmin(req))return send(res,401,{error:'Administrator sign-in is required.'});
    const status=Array.isArray(req.query?.status)?req.query.status[0]:req.query?.status; if(status&&!CUSTOMER_REQUEST_STATUSES.includes(status))return send(res,400,{error:'Invalid status filter.'});
    const page=Number(req.query?.page||1); const limit=Number(req.query?.limit||20); if(!Number.isInteger(page)||page<1||!Number.isInteger(limit)||limit<1||limit>100)return send(res,400,{error:'Invalid pagination parameters.'});
    res.setHeader('Cache-Control','private, no-store'); try { const result=await repository.listCustomerRequests({status:status||null,limit,offset:(page-1)*limit}); return send(res,200,{...result,page,limit}); } catch(error){console.error('Customer request list failed:',error instanceof Error?error.message:'Unknown error');return send(res,500,{error:'Customer requests could not be loaded right now.'});} };
}
export function createAdminCustomerRequestItemHandler(repository) {
  return async (req,res) => { if(!['GET','PATCH'].includes(req.method)){res.setHeader('Allow','GET, PATCH');return send(res,405,{error:'Method not allowed.'});} if(!isAdmin(req))return send(res,401,{error:'Administrator sign-in is required.'});
    const id=Array.isArray(req.query?.id)?req.query.id[0]:req.query?.id;if(!validId(id))return send(res,400,{error:'Invalid customer request ID.'}); res.setHeader('Cache-Control','private, no-store');
    try { if(req.method==='GET'){const item=await repository.getCustomerRequest(id);return item?send(res,200,{request:item}):send(res,404,{error:'Customer request not found.'});}
      if(!hasValidOrigin(req))return send(res,403,{error:'Request origin could not be verified.'}); if(!isJson(req))return send(res,415,{error:'Content-Type must be application/json.'}); const parsed=parseBody(req,1000);if(parsed.error)return send(res,parsed.error==='too_large'?413:400,{error:'Invalid request body.'}); const validation=validateStatusUpdate(parsed.body);if(!validation.valid)return send(res,400,{error:'Please correct the highlighted fields.',errors:validation.errors}); const item=await repository.updateCustomerRequestStatus(id,validation.data.status);return item?send(res,200,{request:item}):send(res,404,{error:'Customer request not found.'});
    } catch(error){console.error('Customer request operation failed:',error instanceof Error?error.message:'Unknown error');return send(res,500,{error:'The customer request could not be processed right now.'});} };
}
