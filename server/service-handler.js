import { hasValidOrigin } from './auth.js';
import { parseBody, send } from './http.js';
import { requirePermission } from './rbac.js';
import { validatePublicServiceQuery, validateService } from './service-validation.js';
import { logServerError } from './logger.js';

const validId = value => /^(?:[1-9]\d*)$/.test(String(value || ''));
const isJson = req => String(req.headers?.['content-type'] || '').toLowerCase().split(';')[0].trim() === 'application/json';

async function authorizeMutation(req, res, permission, authorize) {
  if (!await authorize(req, res, permission)) return false;
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
    const validation = validatePublicServiceQuery(req.query);
    if (!validation.valid) return send(res, 400, { error: 'Invalid search parameters.', errors: validation.errors });
    try {
      const result = await repository.listPublicServices(validation.data);
      return send(res, 200, {
        services: result.services,
        filters: { categories: result.categories },
        pagination: { page: validation.data.page, limit: validation.data.limit, total: result.total, totalPages: Math.ceil(result.total / validation.data.limit) },
      });
    }
    catch (error) {
      logServerError('services.public.list', error, req);
      return send(res, 500, { error: 'Services could not be loaded right now.' });
    }
  };
}

export function createAdminServicesHandler(repository, authorize = requirePermission) {
  return async function adminServicesHandler(req, res) {
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'Method not allowed.' }); }
    if (!await authorize(req, res, req.method === 'GET' ? 'services:view' : 'services:create')) return undefined;
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      try { return send(res, 200, { services: await repository.listAdminServices() }); }
      catch (error) {
        logServerError('services.admin.list', error, req);
        return send(res, 500, { error: 'Services could not be loaded right now.' });
      }
    }
    if (!hasValidOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
    const data = parseService(req, res);
    if (!data) return undefined;
    try { return send(res, 201, { service: await repository.createService(data) }); }
    catch (error) {
      logServerError('services.admin.create', error, req);
      return send(res, 500, { error: 'The service could not be created right now.' });
    }
  };
}

export function createAdminServiceItemHandler(repository, authorize = requirePermission) {
  return async function adminServiceItemHandler(req, res) {
    if (!['PATCH', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'PATCH, DELETE'); return send(res, 405, { error: 'Method not allowed.' }); }
    if (!await authorizeMutation(req, res, req.method === 'PATCH' ? 'services:update' : 'services:delete', authorize)) return undefined;
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
      logServerError(`services.admin.${req.method === 'DELETE' ? 'delete' : 'update'}`, error, req);
      return send(res, 500, { error: 'The service could not be changed right now.' });
    }
  };
}
