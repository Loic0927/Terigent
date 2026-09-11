import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnnouncementsHandler, createAnnouncementItemHandler } from '../server/announcement-handler.js';
import { createSession, sessionCookie } from '../server/auth.js';

process.env.SESSION_SECRET = 'test-only-session-secret-with-more-than-32-characters';
const originHeaders = { origin: 'http://localhost', host: 'localhost', 'x-forwarded-proto': 'http' };

function response() { return { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } }; }
async function call(handler, method, { body, id, authenticated = false } = {}) {
  const res = response(); const headers = { ...originHeaders };
  if (authenticated) headers.cookie = sessionCookie(createSession('admin')).split(';')[0];
  await handler({ method, headers, body, query: id === undefined ? {} : { id }, socket: {} }, res); return res;
}

test('public can list announcements newest first through repository result', async () => {
  const items = [{ id: '2', title: 'New', content: 'Latest' }];
  const res = await call(createAnnouncementsHandler({ listAnnouncements: async () => items }), 'GET');
  assert.equal(res.statusCode, 200); assert.deepEqual(res.payload.announcements, items);
});

test('anonymous users cannot create, edit, or delete', async () => {
  const repository = { createAnnouncement: async () => assert.fail(), updateAnnouncement: async () => assert.fail(), deleteAnnouncement: async () => assert.fail() };
  assert.equal((await call(createAnnouncementsHandler(repository), 'POST', { body: { title: 'A', content: 'B' } })).statusCode, 401);
  const handler = createAnnouncementItemHandler(repository);
  assert.equal((await call(handler, 'PATCH', { id: '1', body: { title: 'A', content: 'B' } })).statusCode, 401);
  assert.equal((await call(handler, 'DELETE', { id: '1' })).statusCode, 401);
});

test('authenticated administrator can complete CRUD operations', async () => {
  let item;
  const repository = {
    listAnnouncements: async () => item ? [item] : [],
    createAnnouncement: async data => (item = { id: '1', ...data }),
    updateAnnouncement: async (id, data) => (item = { id, ...data }),
    deleteAnnouncement: async id => { const old = item; item = null; return old && { id }; },
  };
  let res = await call(createAnnouncementsHandler(repository), 'POST', { authenticated: true, body: { title: ' New ', content: ' Body ' } });
  assert.equal(res.statusCode, 201); assert.equal(res.payload.announcement.title, 'New');
  res = await call(createAnnouncementItemHandler(repository), 'PATCH', { authenticated: true, id: '1', body: { title: 'Updated', content: 'Changed' } });
  assert.equal(res.statusCode, 200); assert.equal(item.title, 'Updated');
  res = await call(createAnnouncementItemHandler(repository), 'DELETE', { authenticated: true, id: '1' });
  assert.equal(res.statusCode, 200); assert.equal(item, null);
});

test('blank and overlong input, invalid IDs, and missing rows return safe errors', async () => {
  const repository = { createAnnouncement: async () => assert.fail(), updateAnnouncement: async () => null, deleteAnnouncement: async () => null };
  let res = await call(createAnnouncementsHandler(repository), 'POST', { authenticated: true, body: { title: ' ', content: '' } });
  assert.equal(res.statusCode, 400); assert.ok(res.payload.errors.title); assert.ok(res.payload.errors.content);
  res = await call(createAnnouncementsHandler(repository), 'POST', { authenticated: true, body: { title: 'x'.repeat(101), content: 'ok' } });
  assert.equal(res.statusCode, 400);
  res = await call(createAnnouncementItemHandler(repository), 'PATCH', { authenticated: true, id: 'bad', body: { title: 'A', content: 'B' } });
  assert.equal(res.statusCode, 400);
  res = await call(createAnnouncementItemHandler(repository), 'DELETE', { authenticated: true, id: '999' });
  assert.equal(res.statusCode, 404);
});

test('cross-origin mutation is rejected', async () => {
  const res = response();
  await createAnnouncementsHandler({})({ method: 'POST', headers: { ...originHeaders, origin: 'https://evil.invalid', cookie: sessionCookie(createSession('admin')).split(';')[0] }, body: {} }, res);
  assert.equal(res.statusCode, 403);
});
