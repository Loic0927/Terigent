import { createHash } from 'node:crypto';
import { hasValidOrigin } from './auth.js';
import { clientIp, parseBody, send } from './http.js';
import { hashPassword, verifyPassword } from './password.js';
import { clearUserSessionCookie, hashSessionToken, newSessionToken, readUserToken, USER_SESSION_SECONDS, userSessionCookie } from './user-auth.js';
import { validateLogin, validateProfileUpdate, validateRegistration } from './user-validation.js';

const keyFor = (req, value) => createHash('sha256').update(`${clientIp(req)}\n${value}`).digest('hex');
const safeError = (res, message = 'Authentication is temporarily unavailable.') => send(res, 500, { error: message });

export function createUserAuthHandlers(repository, clock = Date.now) {
  async function register(req, res) {
    if (req.method !== 'POST') { res.setHeader('Allow','POST'); return send(res,405,{error:'Method not allowed.'}); }
    if (!hasValidOrigin(req)) return send(res,403,{error:'Request origin could not be verified.'});
    const parsed=parseBody(req,6000); if(parsed.error) return send(res,parsed.error==='too_large'?413:400,{error:'Invalid request body.'});
    const result=validateRegistration(parsed.body); if(!result.valid) return send(res,400,{error:'Please correct the highlighted fields.',errors:result.errors});
    const key=keyFor(req,result.data.email);
    try {
      if(await repository.rateLimited(key,'register',5)) return send(res,429,{error:'Too many attempts. Try again in 15 minutes.'});
      await repository.recordAttempt(key,'register');
      const user=await repository.createUser({...result.data,passwordHash:await hashPassword(result.data.password)});
      await repository.clearAttempts?.(key,'register');
      return send(res,201,{message:'Account created. You can now sign in.',user});
    } catch(error) { if(error?.code==='23505') return send(res,409,{error:'An account with this email already exists.',errors:{email:'Email is already registered.'}}); console.error('User registration failed:',error instanceof Error?error.message:'Unknown error'); return safeError(res,'Registration is temporarily unavailable.'); }
  }
  async function login(req,res) {
    if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Method not allowed.'});}
    if(!hasValidOrigin(req)) return send(res,403,{error:'Request origin could not be verified.'});
    const parsed=parseBody(req,4000); if(parsed.error)return send(res,parsed.error==='too_large'?413:400,{error:'Invalid request body.'});
    const result=validateLogin(parsed.body); if(!result.valid)return send(res,401,{error:'Email or password is incorrect.'});
    const key=keyFor(req,result.data.email);
    try { if(await repository.rateLimited(key,'login',5))return send(res,429,{error:'Too many attempts. Try again in 15 minutes.'});
      await repository.recordAttempt(key,'login'); const user=await repository.findUserForLogin(result.data.email);
      if(!user || !(await verifyPassword(result.data.password,user.passwordHash))) return send(res,401,{error:'Email or password is incorrect.'});
      await repository.clearAttempts?.(key,'login');
      const token=newSessionToken(); await repository.createSession({userId:user.id,tokenHash:hashSessionToken(token),expiresAt:new Date(clock()+USER_SESSION_SECONDS*1000)});
      res.setHeader('Set-Cookie',userSessionCookie(token)); const safeUser={...user}; delete safeUser.passwordHash; return send(res,200,{user:safeUser});
    } catch(error){console.error('User login failed:',error instanceof Error?error.message:'Unknown error');return safeError(res);}
  }
  async function me(req,res){
    res.setHeader('Cache-Control','private, no-store');
    if(!['GET','PATCH'].includes(req.method)){res.setHeader('Allow','GET, PATCH');return send(res,405,{error:'Method not allowed.'});}
    const token=readUserToken(req); if(!token)return send(res,401,{error:'Sign-in is required.'});
    try{
      const user=await repository.findSession(hashSessionToken(token));
      if(!user)return send(res,401,{error:'Sign-in is required.'});
      if(req.method==='GET')return send(res,200,{user});
      if(!hasValidOrigin(req))return send(res,403,{error:'Request origin could not be verified.'});
      const parsed=parseBody(req,2000);if(parsed.error)return send(res,parsed.error==='too_large'?413:400,{error:'Invalid request body.'});
      const result=validateProfileUpdate(parsed.body);if(!result.valid)return send(res,400,{error:'Please correct the highlighted fields.',errors:result.errors});
      const updated=await repository.updateUserProfile(user.id,result.data);
      return updated?send(res,200,{message:'Account details updated.',user:updated}):send(res,404,{error:'Account not found.'});
    }catch(error){console.error('User profile request failed:',error instanceof Error?error.message:'Unknown error');return safeError(res,'Account details are temporarily unavailable.');}
  }
  async function logout(req,res){res.setHeader('Cache-Control','private, no-store');if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Method not allowed.'});}if(!hasValidOrigin(req))return send(res,403,{error:'Request origin could not be verified.'});const token=readUserToken(req);try{if(token)await repository.revokeSession(hashSessionToken(token));res.setHeader('Set-Cookie',clearUserSessionCookie());return send(res,200,{authenticated:false});}catch(error){console.error('User logout failed:',error instanceof Error?error.message:'Unknown error');return safeError(res,'Sign-out is temporarily unavailable.');}}
  return {register,login,me,logout};
}
