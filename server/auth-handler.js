import { createHash } from 'node:crypto';
import { clearSessionCookie, createSession, hasValidOrigin, isAdmin, sessionCookie } from './auth.js';
import { clientIp, parseBody, send } from './http.js';
import { verifyPassword } from './password.js';

function attemptKey(req, username) {
  return createHash('sha256').update(`${clientIp(req)}\n${username.toLowerCase()}`).digest('hex');
}

export function createLoginHandler(repository) {
  return async function loginHandler(req, res) {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Method not allowed.' }); }
    if (!hasValidOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
    const parsed = parseBody(req, 4_000);
    if (parsed.error) return send(res, parsed.error === 'too_large' ? 413 : 400, { error: 'Invalid request body.' });
    const username = typeof parsed.body.username === 'string' ? parsed.body.username.trim() : '';
    const password = typeof parsed.body.password === 'string' ? parsed.body.password : '';
    if (!username || !password || username.length > 100 || password.length > 1000) return send(res, 400, { error: 'Enter your username and password.' });
    const key = attemptKey(req, username);
    try {
      if (await repository.loginBlocked(key)) return send(res, 429, { error: 'Too many failed attempts. Try again in 15 minutes.' });
      const expectedUser = process.env.ADMIN_USERNAME;
      const passwordValid = await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH);
      const valid = Boolean(expectedUser && username === expectedUser && passwordValid);
      await repository.recordLogin(key, valid);
      if (!valid) return send(res, 401, { error: 'Invalid username or password.' });
      await repository.clearLoginFailures(key);
      res.setHeader('Set-Cookie', sessionCookie(createSession(username)));
      return send(res, 200, { authenticated: true, username });
    } catch (error) {
      console.error('Administrator login failed:', error instanceof Error ? error.message : 'Unknown error');
      return send(res, 500, { error: 'Sign-in is temporarily unavailable.' });
    }
  };
}

export function sessionHandler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(res, 405, { error: 'Method not allowed.' }); }
  res.setHeader('Cache-Control', 'no-store');
  return send(res, 200, { authenticated: isAdmin(req) });
}

export function logoutHandler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Method not allowed.' }); }
  if (!hasValidOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
  res.setHeader('Set-Cookie', clearSessionCookie());
  return send(res, 200, { authenticated: false });
}
