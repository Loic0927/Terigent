import { hasValidOrigin } from './auth.js';
import { parseBody, send } from './http.js';
import { requirePermission } from './rbac.js';
import { deleteBlob } from './document-blob.js';

const validId = value => /^(?:[1-9]\d*)$/.test(String(value || ''));

export function createAdminUsersHandler(repository, authorize = requirePermission) {
  return async function adminUsersHandler(req, res) {
    if (!['GET', 'PATCH', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'GET, PATCH, DELETE'); return send(res, 405, { error: 'Method not allowed.' }); }
    const permission = req.method === 'GET' ? 'users:view' : req.method === 'PATCH' ? 'users:assign-role' : 'users:delete';
    let principal;
    try { principal = await authorize(req, res, permission); }
    catch (error) { console.error('User authorization failed:', error instanceof Error ? error.message : 'Unknown error'); return send(res, 500, { error: 'Authorization is temporarily unavailable.' }); }
    if (!principal) return undefined;
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method === 'GET') {
      const raw = Array.isArray(req.query?.q) ? null : req.query?.q;
      const search = typeof raw === 'string' ? raw.trim() : '';
      if (raw !== undefined && (raw === null || typeof raw !== 'string' || search.length > 100)) return send(res, 400, { error: 'Invalid search query.' });
      try { const users = await repository.listUsers(search); return send(res, 200, { users: users.filter(user => user.role !== 'root') }); }
      catch (error) { console.error('User list failed:', error instanceof Error ? error.message : 'Unknown error'); return send(res, 500, { error: 'Users could not be loaded right now.' }); }
    }
    if (!hasValidOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
    const parsed = parseBody(req, 1000);
    if (parsed.error) return send(res, parsed.error === 'too_large' ? 413 : 400, { error: 'Invalid request body.' });
    const keys = Object.keys(parsed.body || {});
    const id = parsed.body?.id;
    if (!validId(id)) return send(res, 400, { error: 'Invalid user ID.' });
    if (principal.id && String(principal.id) === String(id)) return send(res, 403, { error: 'You cannot change or delete your own account.' });
    try {
      if (req.method === 'PATCH') {
        if (keys.length !== 2 || !keys.includes('id') || !keys.includes('role') || !['user', 'staff'].includes(parsed.body.role)) return send(res, 400, { error: 'Role must be either user or staff.' });
        const user = await repository.assignRole(id, parsed.body.role);
        return user ? send(res, 200, { message: 'User role updated.', user }) : send(res, 404, { error: 'Eligible user not found.' });
      }
      if (keys.length !== 1 || !keys.includes('id')) return send(res, 400, { error: 'Only a user ID may be supplied.' });
      if (repository.listDocumentKeys) {
        const documents = await repository.listDocumentKeys(id);
        for (const document of documents) await deleteBlob(document.storageKey);
      }
      const user = await repository.deleteUser(id);
      return user ? send(res, 200, { message: 'User deleted.' }) : send(res, 404, { error: 'Eligible user not found.' });
    } catch (error) { console.error('User management failed:', error instanceof Error ? error.message : 'Unknown error'); return send(res, 500, { error: 'The user could not be changed right now.' }); }
  };
}
