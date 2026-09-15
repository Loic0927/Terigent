import { createHash, randomBytes } from 'node:crypto';
import { readCookies } from './auth.js';

export const USER_SESSION_COOKIE = 'terigent_user_session';
export const USER_SESSION_SECONDS = 60 * 60 * 24 * 7;
export const newSessionToken = () => randomBytes(32).toString('base64url');
export const hashSessionToken = token => createHash('sha256').update(token).digest('hex');
export const readUserToken = req => readCookies(req)[USER_SESSION_COOKIE];

export function userSessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${USER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${USER_SESSION_SECONDS}${secure}`;
}
export function clearUserSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${USER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
