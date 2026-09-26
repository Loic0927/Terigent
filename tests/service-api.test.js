import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminServiceItemHandler, createAdminServicesHandler, createPublicServicesHandler } from '../server/service-handler.js';
import { buildPublicServiceQuery } from '../server/service-repository.js';
import { createSession, sessionCookie } from '../server/auth.js';

process.env.SESSION_SECRET = 'test-only-session-secret-with-more-than-32-characters';
const originHeaders = { origin: 'http://localhost', host: 'localhost', 'x-forwarded-proto': 'http' };
const valid = { name: 'Workflow design', description: 'A clear operating system for your team.', category: 'Consulting', pricingText: 'From $500', active: true };

function response() { return { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } }; }
async function call(handler, method, { body, id, query, authenticated = false, cookie, headers = {} } = {}) {
  const res = response(); const requestHeaders = { ...originHeaders, ...headers };
  if (body !== undefined && !requestHeaders['content-type']) requestHeaders['content-type'] = 'application/json';
  if (authenticated) requestHeaders.cookie = sessionCookie(createSession('admin')).split(';')[0];
  if (cookie) requestHeaders.cookie = cookie;
  await handler({ method, headers: requestHeaders, body, query: query || (id === undefined ? {} : { id }), socket: {} }, res);
  return res;
}

test('administrator can list every service', async () => {
  const services = [{ id: '2', ...valid, active: false }, { id: '1', ...valid }];
  const res = await call(createAdminServicesHandler({ listAdminServices: async () => services }), 'GET', { authenticated: true });
  assert.equal(res.statusCode, 200); assert.deepEqual(res.payload.services, services); assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('anonymous and member users cannot use admin service APIs', async () => {
  const repository = { listAdminServices: async () => assert.fail(), createService: async () => assert.fail(), updateService: async () => assert.fail(), deleteService: async () => assert.fail() };
  assert.equal((await call(createAdminServicesHandler(repository), 'GET')).statusCode, 401);
  assert.equal((await call(createAdminServicesHandler(repository), 'POST', { body: valid, cookie: 'terigent_user_session=member' })).statusCode, 401);
  assert.equal((await call(createAdminServiceItemHandler(repository), 'PATCH', { id: '1', body: valid })).statusCode, 401);
  assert.equal((await call(createAdminServiceItemHandler(repository), 'DELETE', { id: '1' })).statusCode, 401);
});

test('administrator can create, update, and delete a service', async () => {
  let item;
  const repository = {
    createService: async data => (item = { id: '1', ...data }),
    updateService: async (id, data) => (item = { id, ...data }),
    deleteService: async id => { const deleted = item; item = null; return deleted && { id }; },
  };
  let res = await call(createAdminServicesHandler(repository), 'POST', { authenticated: true, body: { ...valid, name: '  Workflow design  ' } });
  assert.equal(res.statusCode, 201); assert.equal(res.payload.service.name, 'Workflow design');
  res = await call(createAdminServiceItemHandler(repository), 'PATCH', { authenticated: true, id: '1', body: { ...valid, name: 'Strategy workshop', active: false } });
  assert.equal(res.statusCode, 200); assert.equal(item.name, 'Strategy workshop'); assert.equal(item.active, false);
  res = await call(createAdminServiceItemHandler(repository), 'DELETE', { authenticated: true, id: '1' });
  assert.equal(res.statusCode, 200); assert.equal(item, null);
});

test('invalid service input, content types, extra fields, IDs, and missing rows are rejected', async () => {
  const repository = { createService: async () => assert.fail(), updateService: async () => null, deleteService: async () => null };
  let res = await call(createAdminServicesHandler(repository), 'POST', { authenticated: true, body: { ...valid, name: ' ' } });
  assert.equal(res.statusCode, 400); assert.ok(res.payload.errors.name);
  res = await call(createAdminServicesHandler(repository), 'POST', { authenticated: true, body: { ...valid, active: 'yes', unexpected: true } });
  assert.equal(res.statusCode, 400); assert.ok(res.payload.errors.active); assert.ok(res.payload.errors.body);
  res = await call(createAdminServicesHandler(repository), 'POST', { authenticated: true, body: valid, headers: { 'content-type': 'text/plain' } });
  assert.equal(res.statusCode, 415);
  res = await call(createAdminServiceItemHandler(repository), 'PATCH', { authenticated: true, id: 'invalid', body: valid });
  assert.equal(res.statusCode, 400);
  res = await call(createAdminServiceItemHandler(repository), 'DELETE', { authenticated: true, id: '999' });
  assert.equal(res.statusCode, 404);
});

test('public users receive only the active services supplied by the public repository', async () => {
  const services = [{ id: '1', ...valid }];
  const res = await call(createPublicServicesHandler({ listPublicServices: async () => ({ services, total: 1, categories: ['Consulting'] }) }), 'GET');
  assert.equal(res.statusCode, 200); assert.deepEqual(res.payload.services, services); assert.ok(res.payload.services.every(service => service.active));
  assert.deepEqual(res.payload.pagination, { page: 1, limit: 24, total: 1, totalPages: 1 });
});

test('public search combines keyword, category, updated sort, and pagination', async () => {
  let received;
  const item = { id: '1', ...valid, updatedAt: '2026-09-20T00:00:00.000Z', matches: [{ field: 'description', snippet: 'operating system' }] };
  const repository = { listPublicServices: async filters => { received = filters; return { services: [item], total: 1, categories: ['Consulting', 'Implementation'] }; } };
  const res = await call(createPublicServicesHandler(repository), 'GET', { query: { q: '  operating  ', category: 'Consulting', sort: 'updated_asc', page: '2', limit: '10' } });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(received, { q: 'operating', category: 'Consulting', sort: 'updated_asc', page: 2, limit: 10 });
  assert.deepEqual(res.payload.services[0].matches, item.matches);
  assert.deepEqual(res.payload.filters.categories, ['Consulting', 'Implementation']);
});

test('public search supports empty results and rejects invalid or excessive parameters', async () => {
  const repository = { listPublicServices: async () => ({ services: [], total: 0, categories: [] }) };
  let res = await call(createPublicServicesHandler(repository), 'GET', { query: { q: 'nothing' } });
  assert.equal(res.statusCode, 200); assert.deepEqual(res.payload.services, []); assert.equal(res.payload.pagination.totalPages, 0);
  for (const query of [{ sort: 'name_desc' }, { page: '0' }, { limit: '51' }, { q: 'x'.repeat(101) }, { q: ['one', 'two'] }, { internal: 'true' }]) {
    res = await call(createPublicServicesHandler({ listPublicServices: async () => assert.fail() }), 'GET', { query });
    assert.equal(res.statusCode, 400); assert.equal(res.payload.error, 'Invalid search parameters.');
  }
});

test('public service database query keeps search input parameterized and sorts by updated time', () => {
  const injection = "%' OR is_active = FALSE --";
  const query = buildPublicServiceQuery({ q: injection, category: 'Consulting', sort: 'updated_desc', page: 2, limit: 10 });
  assert.doesNotMatch(query.text, /is_active = FALSE|Consulting/);
  assert.match(query.text, /is_active = TRUE/);
  assert.match(query.text, /ORDER BY updated_at DESC, id DESC/);
  assert.deepEqual(query.values, [injection.toLocaleLowerCase(), 'Consulting', 10, 10]);
  assert.deepEqual(query.filterValues, query.values.slice(0, 2));
});

test('deleted or unavailable services no longer appear publicly', async () => {
  let records = [{ id: '1', ...valid }, { id: '2', ...valid, name: 'Hidden', active: false }];
  const repository = {
    listPublicServices: async () => ({ services: records.filter(item => item.active), total: records.filter(item => item.active).length, categories: ['Consulting'] }),
    deleteService: async id => { const found = records.find(item => item.id === id); records = records.filter(item => item.id !== id); return found ? { id } : null; },
  };
  let res = await call(createPublicServicesHandler(repository), 'GET');
  assert.deepEqual(res.payload.services.map(item => item.id), ['1']);
  await call(createAdminServiceItemHandler(repository), 'DELETE', { authenticated: true, id: '1' });
  res = await call(createPublicServicesHandler(repository), 'GET');
  assert.deepEqual(res.payload.services, []);
});

test('database errors return safe responses without leaking details', async () => {
  const failure = async () => { throw new Error('password=secret host=private-db'); };
  let res = await call(createPublicServicesHandler({ listPublicServices: failure }), 'GET');
  assert.equal(res.statusCode, 500); assert.equal(res.payload.error, 'Services could not be loaded right now.'); assert.doesNotMatch(JSON.stringify(res.payload), /secret|private-db/);
  res = await call(createAdminServicesHandler({ createService: failure }), 'POST', { authenticated: true, body: valid });
  assert.equal(res.statusCode, 500); assert.equal(res.payload.error, 'The service could not be created right now.');
});

test('cross-origin admin mutations are rejected', async () => {
  const res = await call(createAdminServicesHandler({}), 'POST', { authenticated: true, body: valid, headers: { origin: 'https://evil.invalid' } });
  assert.equal(res.statusCode, 403);
});
