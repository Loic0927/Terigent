import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createAdminUsersHandler } from '../server/admin-user-handler.js';
import { createAnnouncementsHandler, createAnnouncementItemHandler } from '../server/announcement-handler.js';
import { hasPermission, permissionsFor } from '../server/rbac.js';
import { createAdminServiceItemHandler, createAdminServicesHandler } from '../server/service-handler.js';

const headers = { origin: 'http://localhost', host: 'localhost', 'x-forwarded-proto': 'http', 'content-type': 'application/json' };
const response = () => ({ statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } });
async function call(handler, method, body, query = {}) { const res = response(); await handler({ method, body, query, headers, socket: {} }, res); return res; }
function authorization(role, id = '99') { return async (_req, res, permission) => { if (!role) { res.status(401).json({ error: 'Sign-in is required.' }); return null; } const principal = { id, role }; if (!hasPermission(principal, permission)) { res.status(403).json({ error: 'Forbidden.' }); return null; } return principal; }; }

const service = { name: 'Service', description: 'Description', category: 'Consulting', pricingText: '', active: true };
const announcement = { title: 'News', content: 'Details' };

test('RBAC permission matrix grants only the specified capabilities', () => {
  assert.equal(hasPermission({ role: 'root' }, 'users:delete'), true);
  assert.equal(hasPermission({ role: 'staff' }, 'services:create'), true);
  assert.equal(hasPermission({ role: 'staff' }, 'announcements:create'), true);
  assert.equal(hasPermission({ role: 'staff' }, 'services:update'), false);
  assert.equal(hasPermission({ role: 'staff' }, 'announcements:delete'), false);
  assert.deepEqual(permissionsFor('user'), []);
});

test('user is forbidden and staff can create but cannot update or delete services and announcements', async () => {
  const serviceRepo = { createService: async data => ({ id: '1', ...data }), updateService: async () => assert.fail(), deleteService: async () => assert.fail() };
  const announcementRepo = { createAnnouncement: async data => ({ id: '1', ...data }), updateAnnouncement: async () => assert.fail(), deleteAnnouncement: async () => assert.fail() };
  assert.equal((await call(createAdminServicesHandler(serviceRepo, authorization('user')), 'POST', service)).statusCode, 403);
  assert.equal((await call(createAnnouncementsHandler(announcementRepo, authorization('user')), 'POST', announcement)).statusCode, 403);
  assert.equal((await call(createAdminServicesHandler(serviceRepo, authorization('staff')), 'POST', service)).statusCode, 201);
  assert.equal((await call(createAnnouncementsHandler(announcementRepo, authorization('staff')), 'POST', announcement)).statusCode, 201);
  assert.equal((await call(createAdminServiceItemHandler(serviceRepo, authorization('staff')), 'PATCH', service, { id: '1' })).statusCode, 403);
  assert.equal((await call(createAdminServiceItemHandler(serviceRepo, authorization('staff')), 'DELETE', undefined, { id: '1' })).statusCode, 403);
  assert.equal((await call(createAnnouncementItemHandler(announcementRepo, authorization('staff')), 'PATCH', announcement, { id: '1' })).statusCode, 403);
  assert.equal((await call(createAnnouncementItemHandler(announcementRepo, authorization('staff')), 'DELETE', undefined, { id: '1' })).statusCode, 403);
});

test('user-management API is root-only and rejects root escalation, self-change, and root deletion', async () => {
  const users = [{ id: '1', name: 'Member', email: 'member@example.test', role: 'user', createdAt: new Date().toISOString() }];
  const repository = { listUsers: async () => users, assignRole: async (id, role) => ({ ...users[0], id, role }), deleteUser: async id => id === '7' ? null : users[0] };
  for (const role of ['user', 'staff']) {
    assert.equal((await call(createAdminUsersHandler(repository, authorization(role)), 'GET')).statusCode, 403);
    assert.equal((await call(createAdminUsersHandler(repository, authorization(role)), 'PATCH', { id: '1', role: 'staff' })).statusCode, 403);
    assert.equal((await call(createAdminUsersHandler(repository, authorization(role)), 'DELETE', { id: '1' })).statusCode, 403);
  }
  const rootHandler = createAdminUsersHandler(repository, authorization('root', '7'));
  assert.equal((await call(rootHandler, 'GET')).statusCode, 200);
  assert.equal((await call(rootHandler, 'PATCH', { id: '1', role: 'staff' })).statusCode, 200);
  assert.equal((await call(rootHandler, 'PATCH', { id: '1', role: 'user' })).statusCode, 200);
  assert.equal((await call(rootHandler, 'PATCH', { id: '1', role: 'root' })).statusCode, 400);
  assert.equal((await call(rootHandler, 'PATCH', { id: '7', role: 'user' })).statusCode, 403);
  assert.equal((await call(rootHandler, 'DELETE', { id: '7' })).statusCode, 403);
  assert.equal((await call(rootHandler, 'DELETE', { id: '1' })).statusCode, 200);
});

test('role revocation is effective on the next request and unauthenticated differs from forbidden', async () => {
  let role = 'staff';
  const dynamic = async (req, res, permission) => authorization(role)(req, res, permission);
  const handler = createAdminServicesHandler({ createService: async data => ({ id: '1', ...data }) }, dynamic);
  assert.equal((await call(handler, 'POST', service)).statusCode, 201);
  role = 'user'; assert.equal((await call(handler, 'POST', service)).statusCode, 403);
  role = null; assert.equal((await call(handler, 'POST', service)).statusCode, 401);
});

test('role migration is safe, constrained, and defaults existing and new users to user', async () => {
  const sql = await readFile(new URL('../db/migrations/007_add_user_roles.sql', import.meta.url), 'utf8');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS role/);
  assert.match(sql, /UPDATE users SET role = 'user' WHERE role IS NULL/);
  assert.match(sql, /SET DEFAULT 'user'/);
  assert.match(sql, /SET NOT NULL/);
  assert.match(sql, /CHECK \(role IN \('user', 'staff', 'root'\)\)/);
  assert.doesNotMatch(sql, /@|password|token/i);
});
