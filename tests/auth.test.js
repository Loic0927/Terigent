import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { createLoginHandler, logoutHandler, sessionHandler } from '../server/auth-handler.js';

process.env.SESSION_SECRET = 'another-test-session-secret-with-at-least-32-characters';
process.env.ADMIN_USERNAME = 'admin';
const salt = randomBytes(16); const hash = await promisify(scrypt)('correct horse battery staple', salt, 64, { N: 16384, r: 8, p: 1 });
process.env.ADMIN_PASSWORD_HASH = `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
const headers = { origin: 'http://localhost', host: 'localhost', 'x-forwarded-proto': 'http' };
function response() { return { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } }; }

test('login creates server-verifiable HttpOnly session and logout invalidates browser cookie', async () => {
  const repository = { loginBlocked: async () => false, recordLogin: async () => {}, clearLoginFailures: async () => {} };
  const loginRes = response();
  await createLoginHandler(repository)({ method: 'POST', headers, body: { username: 'admin', password: 'correct horse battery staple' }, socket: {} }, loginRes);
  assert.equal(loginRes.statusCode, 200); assert.match(loginRes.headers['Set-Cookie'], /HttpOnly/);
  const cookie = loginRes.headers['Set-Cookie'].split(';')[0]; const sessionRes = response();
  sessionHandler({ method: 'GET', headers: { cookie } }, sessionRes); assert.equal(sessionRes.payload.authenticated, true);
  const logoutRes = response(); logoutHandler({ method: 'POST', headers }, logoutRes); assert.match(logoutRes.headers['Set-Cookie'], /Max-Age=0/);
  const loggedOutRes = response(); sessionHandler({ method: 'GET', headers: { cookie: logoutRes.headers['Set-Cookie'].split(';')[0] } }, loggedOutRes); assert.equal(loggedOutRes.payload.authenticated, false);
});

test('wrong password is rejected and database-backed limiter can block attempts', async () => {
  let recorded = false;
  const repository = { loginBlocked: async () => false, recordLogin: async (key, success) => { recorded = !success; }, clearLoginFailures: async () => {} };
  let res = response(); await createLoginHandler(repository)({ method: 'POST', headers, body: { username: 'admin', password: 'wrong' }, socket: {} }, res);
  assert.equal(res.statusCode, 401); assert.equal(recorded, true);
  res = response(); await createLoginHandler({ ...repository, loginBlocked: async () => true })({ method: 'POST', headers, body: { username: 'admin', password: 'wrong' }, socket: {} }, res);
  assert.equal(res.statusCode, 429);
});
