import { hasValidOrigin, isAdmin } from './auth.js';
import { parseBody, send } from './http.js';
import { validateService } from './service-validation.js';

const validId = value => /^(?:[1-9]\d*)$/.test(String(value || ''));
const isJson = req => String(req.headers?.['content-type'] || '').toLowerCase().split(';')[0].trim() === 'application/json';

function authorizeMutation(req, res) {
  if (!isAdmin(req)) { send(res, 401, { error: 'Administrator sign-in is required.' }); return false; }
  if (!hasValidOrigin(req)) { send(res, 403, { error: 'Request origin could not be verified.' }); return false; }
  return true;
}

function parseService(req, res) {
  if (!isJson(req)) { send(res, 415, { error: 'Content-Type must be application/json.' }); return null; }
  const parsed = parseBody(req);
  if (parsed.error === 'too_large') { send(res, 413, { error: 'Request is too large.' }); return null; }
  if (parsed.error) { send(res, 400, { error: 'Invalid request body.' }); return null; }
  const validation = validateService(parsed.body);
  if (!validation.valid) { send(res, 400, { error: 'Please correct the highlighted fields.', errors: validation.errors }); return null; }
  return validation.data;
}

export function createPublicServicesHandler(repository) {
  return async function publicServicesHandler(req, res) {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(res, 405, { error: 'Method not allowed.' }); }
    res.setHeader('Cache-Control', 'no-store');
    try { return send(res, 200, { services: await repository.listPublicServices() }); }
    catch (error) {
      console.error('Public service list failed:', error instanceof Error ? error.message : 'Unknown error');
      return send(res, 500, { error: 'Services could not be loaded right now.' });
    }
  };
}

export function createAdminServicesHandler(repository) {
  return async function adminServicesHandler(req, res) {
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'Method not allowed.' }); }
    if (!isAdmin(req)) return send(res, 401, { error: 'Administrator sign-in is required.' });
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      try { return send(res, 200, { services: await repository.listAdminServices() }); }
      catch (error) {
        console.error('Admin service list failed:', error instanceof Error ? error.message : 'Unknown error');
        return send(res, 500, { error: 'Services could not be loaded right now.' });
      }
    }
    if (!hasValidOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
    const data = parseService(req, res);
    if (!data) return undefined;
    try { return send(res, 201, { service: await repository.createService(data) }); }
    catch (error) {
      console.error('Service creation failed:', error instanceof Error ? error.message : 'Unknown error');
      return send(res, 500, { error: 'The service could not be created right now.' });
    }
  };
}

export function createAdminServiceItemHandler(repository) {
  return async function adminServiceItemHandler(req, res) {
    if (!['PATCH', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'PATCH, DELETE'); return send(res, 405, { error: 'Method not allowed.' }); }
    if (!authorizeMutation(req, res)) return undefined;
    const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
    if (!validId(id)) return send(res, 400, { error: 'Invalid service ID.' });
    try {
      if (req.method === 'DELETE') {
        const deleted = await repository.deleteService(id);
        return deleted ? send(res, 200, { message: 'Service deleted.' }) : send(res, 404, { error: 'Service not found.' });
      }
      const data = parseService(req, res);
      if (!data) return undefined;
      const updated = await repository.updateService(id, data);
      return updated ? send(res, 200, { service: updated }) : send(res, 404, { error: 'Service not found.' });
    } catch (error) {
      console.error('Service mutation failed:', error instanceof Error ? error.message : 'Unknown error');
      return send(res, 500, { error: 'The service could not be changed right now.' });
    }
  };
}
