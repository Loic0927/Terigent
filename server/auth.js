import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'terigent_admin_session';
const SESSION_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  return value;
}

function sign(value) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function same(a, b) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSession(username, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: username, exp: Math.floor(now / 1000) + SESSION_SECONDS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token, now = Date.now()) {
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra || !same(signature, sign(payload))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.sub !== 'string' || !Number.isInteger(data.exp) || data.exp <= Math.floor(now / 1000)) return null;
    return data;
  } catch { return null; }
}

export function readCookies(req) {
  const cookies = {};
  for (const item of String(req.headers?.cookie || '').split(';')) {
    const separator = item.indexOf('=');
    if (separator < 1) continue;
    try { cookies[decodeURIComponent(item.slice(0, separator).trim())] = decodeURIComponent(item.slice(separator + 1).trim()); } catch { /* Ignore malformed cookies. */ }
  }
  return cookies;
}

export function isAdmin(req) {
  const token = readCookies(req)[SESSION_COOKIE];
  return Boolean(token && verifySession(token));
}

export function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function hasValidOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return false;
  const forwardedHost = req.headers?.['x-forwarded-host'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers?.host;
  const forwardedProto = req.headers?.['x-forwarded-proto'];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(',')[0] || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  try { return new URL(origin).host === host && new URL(origin).protocol === `${proto}:`; } catch { return false; }
}
