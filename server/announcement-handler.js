import { hasValidOrigin } from './auth.js';
import { parseBody, send } from './http.js';
import { requirePermission } from './rbac.js';
import { validateAnnouncement } from './announcement-validation.js';

const validId = value => /^(?:[1-9]\d*)$/.test(String(value || ''));

export function createAnnouncementsHandler(repository, authorize = requirePermission) {
  return async function announcementsHandler(req, res) {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      try { return send(res, 200, { announcements: await repository.listAnnouncements() }); }
      catch (error) {
        console.error('Announcement list failed:', error instanceof Error ? error.message : 'Unknown error');
        return send(res, 500, { error: 'Announcements could not be loaded right now.' });
      }
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'Method not allowed.' }); }
    if (!await authorize(req, res, 'announcements:create')) return undefined;
    if (!hasValidOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
    const parsed = parseBody(req);
    if (parsed.error === 'too_large') return send(res, 413, { error: 'Request is too large.' });
    if (parsed.error) return send(res, 400, { error: 'Invalid request body.' });
    const validation = validateAnnouncement(parsed.body);
    if (!validation.valid) return send(res, 400, { error: 'Please correct the highlighted fields.', errors: validation.errors });
    try { return send(res, 201, { announcement: await repository.createAnnouncement(validation.data) }); }
    catch (error) {
      console.error('Announcement creation failed:', error instanceof Error ? error.message : 'Unknown error');
      return send(res, 500, { error: 'The announcement could not be created right now.' });
    }
  };
}

export function createAnnouncementItemHandler(repository, authorize = requirePermission) {
  return async function announcementItemHandler(req, res) {
    if (!['PATCH', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'PATCH, DELETE'); return send(res, 405, { error: 'Method not allowed.' }); }
    if (!await authorize(req, res, req.method === 'PATCH' ? 'announcements:update' : 'announcements:delete')) return undefined;
    if (!hasValidOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
    const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
    if (!validId(id)) return send(res, 400, { error: 'Invalid announcement ID.' });
    try {
      if (req.method === 'DELETE') {
        const deleted = await repository.deleteAnnouncement(id);
        return deleted ? send(res, 200, { message: 'Announcement deleted.' }) : send(res, 404, { error: 'Announcement not found.' });
      }
      const parsed = parseBody(req);
      if (parsed.error === 'too_large') return send(res, 413, { error: 'Request is too large.' });
      if (parsed.error) return send(res, 400, { error: 'Invalid request body.' });
      const validation = validateAnnouncement(parsed.body);
      if (!validation.valid) return send(res, 400, { error: 'Please correct the highlighted fields.', errors: validation.errors });
      const updated = await repository.updateAnnouncement(id, validation.data);
      return updated ? send(res, 200, { announcement: updated }) : send(res, 404, { error: 'Announcement not found.' });
    } catch (error) {
      console.error('Announcement mutation failed:', error instanceof Error ? error.message : 'Unknown error');
      return send(res, 500, { error: 'The announcement could not be changed right now.' });
    }
  };
}
