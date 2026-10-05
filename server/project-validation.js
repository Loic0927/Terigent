export const PROJECT_STATUSES = ['not-started', 'in-progress', 'completed', 'on-hold'];
const id = value => /^(?:[1-9]\d*)$/.test(String(value || ''));
const string = (value, max, required = false) => typeof value === 'string' && (!required || value.trim()) && value.trim().length <= max;

export function validateClient(body) {
  const errors = {};
  if (!body || Object.keys(body).some(key => !['name', 'email', 'phone'].includes(key))) errors.body = 'Only name, email, and phone may be supplied.';
  if (!string(body?.name, 120, true)) errors.name = 'Name is required and must be at most 120 characters.';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!string(body?.phone ?? '', 40)) errors.phone = 'Phone must be at most 40 characters.';
  return Object.keys(errors).length ? { valid: false, errors } : { valid: true, data: { name: body.name.trim(), email, phone: (body.phone || '').trim() } };
}

export function validateProject(body) {
  const errors = {};
  const allowed = ['name', 'description', 'status', 'progress', 'clientId', 'memberIds'];
  if (!body || Object.keys(body).some(key => !allowed.includes(key))) errors.body = 'The project contains unsupported fields.';
  if (!string(body?.name, 120, true)) errors.name = 'Name is required and must be at most 120 characters.';
  if (!string(body?.description ?? '', 3000)) errors.description = 'Description must be at most 3000 characters.';
  if (!PROJECT_STATUSES.includes(body?.status)) errors.status = 'Select a valid project status.';
  if (!Number.isInteger(body?.progress) || body.progress < 0 || body.progress > 100) errors.progress = 'Progress must be an integer from 0 to 100.';
  if (!id(body?.clientId)) errors.clientId = 'Select a valid client.';
  if (!Array.isArray(body?.memberIds) || body.memberIds.length > 100 || new Set(body.memberIds.map(String)).size !== body.memberIds.length || body.memberIds.some(value => !id(value))) errors.memberIds = 'Select valid, unique team members.';
  return Object.keys(errors).length ? { valid: false, errors } : { valid: true, data: { name: body.name.trim(), description: (body.description || '').trim(), status: body.status, progress: body.progress, clientId: String(body.clientId), memberIds: body.memberIds.map(String) } };
}

export function validateStaffProgress(body) {
  const errors = {};
  if (!body || Object.keys(body).some(key => !['status', 'progress'].includes(key)) || !Object.keys(body || {}).length) errors.body = 'Only status and progress may be updated.';
  if (body?.status !== undefined && !PROJECT_STATUSES.includes(body.status)) errors.status = 'Select a valid project status.';
  if (body?.progress !== undefined && (!Number.isInteger(body.progress) || body.progress < 0 || body.progress > 100)) errors.progress = 'Progress must be an integer from 0 to 100.';
  return Object.keys(errors).length ? { valid: false, errors } : { valid: true, data: { ...(body.status !== undefined && { status: body.status }), ...(body.progress !== undefined && { progress: body.progress }) } };
}

export const validProjectId = id;
