import { isAdmin } from './auth.js';
import { getPool } from './database.js';
import { hashSessionToken, readUserToken } from './user-auth.js';
import { send } from './http.js';

export const PERMISSIONS = Object.freeze({
  ROOT: Object.freeze([
    'services:view', 'services:create', 'services:update', 'services:delete',
    'announcements:view', 'announcements:create', 'announcements:update', 'announcements:delete',
    'users:view', 'users:assign-role', 'users:delete', 'customer-requests:manage',
  ]),
  STAFF: Object.freeze(['services:view', 'services:create', 'services:update', 'announcements:view', 'announcements:create', 'announcements:update']),
  USER: Object.freeze([]),
});

const permissionsByRole = { root: PERMISSIONS.ROOT, staff: PERMISSIONS.STAFF, user: PERMISSIONS.USER };

export async function findMemberPrincipal(tokenHash) {
  const result = await getPool().query(
    `SELECT u.id::text, u.name, u.email, u.role
       FROM user_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
    [tokenHash],
  );
  return result.rows[0] || null;
}

export async function getAuthenticatedPrincipal(req, lookup = findMemberPrincipal) {
  if (isAdmin(req)) return { id: null, name: 'Administrator', role: 'root', source: 'admin' };
  const token = readUserToken(req);
  if (!token) return null;
  if (!process.env.DATABASE_URL && lookup === findMemberPrincipal) return null;
  const user = await lookup(hashSessionToken(token));
  return user ? { ...user, source: 'member' } : null;
}

export function hasPermission(principal, permission) {
  return Boolean(principal && permissionsByRole[principal.role]?.includes(permission));
}

export async function requirePermission(req, res, permission, lookup) {
  let principal;
  try { principal = await getAuthenticatedPrincipal(req, lookup); }
  catch (error) {
    console.error('Authorization lookup failed:', error instanceof Error ? error.message : 'Unknown error');
    send(res, 500, { error: 'Authorization is temporarily unavailable.' });
    return null;
  }
  if (!principal) { send(res, 401, { error: 'Sign-in is required.' }); return null; }
  if (!hasPermission(principal, permission)) { send(res, 403, { error: 'You do not have permission to perform this action.' }); return null; }
  return principal;
}

export async function requireRole(req, res, ...roles) {
  const principal = await getAuthenticatedPrincipal(req);
  if (!principal) { send(res, 401, { error: 'Sign-in is required.' }); return null; }
  if (!roles.includes(principal.role)) { send(res, 403, { error: 'You do not have permission to perform this action.' }); return null; }
  return principal;
}

export const permissionsFor = role => [...(permissionsByRole[role] || [])];
