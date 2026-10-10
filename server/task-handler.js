import { hasValidOrigin } from './auth.js';
import { parseBody, send } from './http.js';
import { logServerError } from './logger.js';
import { hashSessionToken, readUserToken } from './user-auth.js';
import { validateTask } from './task-validation.js';

const validId = value => /^[1-9]\d*$/.test(String(value || ''));
async function member(req, authRepository) {
  const token = readUserToken(req);
  const user = token ? await authRepository.findSession(hashSessionToken(token)) : null;
  return user ? { ...user, role: user.role || 'user' } : null;
}
function taskFailure(req, res, error, message) {
  const missing = error?.code === '42P01' || error?.code === '42703';
  logServerError('tasks.operation', error, req);
  return send(res, 500, { error: missing ? 'Tasks are not configured yet. Apply the pending database migrations and try again.' : message });
}
const privateHeaders = res => res.setHeader('Cache-Control', 'private, no-store');
const relationError = invalid => invalid === 'assignee'
  ? { error: 'The assignee must be an active staff member assigned to the selected project.', errors: { assigneeUserId: 'Choose a staff member assigned to this project.' } }
  : invalid === 'owner'
    ? { error: 'A database-backed member account is required to create tasks.' }
    : { error: 'The selected project is unavailable or not assigned to you.', errors: { projectId: 'Choose an accessible project.' } };

export function createTasksHandler(repository, authRepository) {
  return async (req, res) => {
    privateHeaders(res);
    const optionsRoute = req.query?.taskRoute === 'options';
    if (req.method !== 'GET' && !(req.method === 'POST' && !optionsRoute)) { res.setHeader('Allow', optionsRoute ? 'GET' : 'GET, POST'); return send(res, 405, { error: 'Method not allowed.' }); }
    try {
      const user = await member(req, authRepository);
      if (!user) return send(res, 401, { error: 'Sign-in is required.' });
      if (optionsRoute) return send(res, 200, await repository.listTaskOptions(user));
      if (req.method === 'GET') return send(res, 200, { tasks: await repository.listTasks(user) });
      if (!hasValidOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
      const parsed = parseBody(req, 8000);
      if (parsed.error) return send(res, parsed.error === 'too_large' ? 413 : 400, { error: 'Invalid request body.' });
      const result = validateTask(parsed.body);
      if (!result.valid) return send(res, 400, { error: 'Please correct the highlighted fields.', errors: result.errors });
      const created = await repository.createTask(user, result.data);
      if (created.invalid) return send(res, 403, relationError(created.invalid));
      return send(res, 201, { task: created.task });
    } catch (error) { return taskFailure(req, res, error, 'Tasks are temporarily unavailable. Please try again.'); }
  };
}

export function createTaskItemHandler(repository, authRepository) {
  return async (req, res) => {
    privateHeaders(res);
    if (!['PUT', 'PATCH', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'PUT, PATCH, DELETE'); return send(res, 405, { error: 'Method not allowed.' }); }
    try {
      const user = await member(req, authRepository);
      if (!user) return send(res, 401, { error: 'Sign-in is required.' });
      if (!hasValidOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
      const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
      if (!validId(id)) return send(res, 400, { error: 'Invalid task ID.' });
      if (req.method === 'DELETE') {
        const deleted = await repository.deleteTask(user, id);
        return deleted ? send(res, 200, { message: 'Task deleted.' }) : send(res, 404, { error: 'Task not found.' });
      }
      const parsed = parseBody(req, 8000);
      if (parsed.error) return send(res, parsed.error === 'too_large' ? 413 : 400, { error: 'Invalid request body.' });
      const result = validateTask(parsed.body);
      if (!result.valid) return send(res, 400, { error: 'Please correct the highlighted fields.', errors: result.errors });
      const updated = await repository.updateTask(user, id, result.data);
      if (!updated) return send(res, 404, { error: 'Task not found.' });
      if (updated.invalid) return send(res, 403, relationError(updated.invalid));
      return send(res, 200, { task: updated.task });
    } catch (error) { return taskFailure(req, res, error, 'The task could not be changed right now. Please try again.'); }
  };
}

export function createTaskAttachmentsHandler(repository, authRepository) {
  return async (req, res) => {
    privateHeaders(res);
    const user = await member(req, authRepository);
    if (!user) return send(res, 401, { error: 'Sign-in is required.' });
    const taskId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
    const documentId = Array.isArray(req.query?.documentId) ? req.query.documentId[0] : req.query?.documentId;
    if (!validId(taskId) || (documentId && !validId(documentId))) return send(res, 404, { error: 'Task or document not found.' });
    if (!hasValidOrigin(req)) return send(res, 403, { error: 'Request origin could not be verified.' });
    try {
      if (req.method === 'POST' && !documentId) {
        const parsed = parseBody(req, 4000);
        if (parsed.error) return send(res, parsed.error === 'too_large' ? 413 : 400, { error: 'Invalid request body.' });
        const ids = parsed.body?.documentIds;
        if (Object.keys(parsed.body || {}).length !== 1 || !Array.isArray(ids) || !ids.length || ids.length > 20 || new Set(ids.map(String)).size !== ids.length || ids.some(id => !validId(id))) return send(res, 400, { error: 'Select one or more valid documents.' });
        const attachments = await repository.addAttachments(user, taskId, ids.map(String));
        return attachments ? send(res, 200, { message: 'Attachments updated.', attachments }) : send(res, 404, { error: 'Task or document not found.' });
      }
      if (req.method === 'DELETE' && documentId) {
        const removed = await repository.removeAttachment(user, taskId, documentId);
        return removed ? send(res, 200, { message: 'Attachment removed.' }) : send(res, 404, { error: 'Task or document not found.' });
      }
      res.setHeader('Allow', documentId ? 'DELETE' : 'POST');
      return send(res, 405, { error: 'Method not allowed.' });
    } catch (error) { return taskFailure(req, res, error, req.method === 'DELETE' ? 'Attachment could not be removed.' : 'Attachments could not be saved.'); }
  };
}
