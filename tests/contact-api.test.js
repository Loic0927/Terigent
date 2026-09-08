import assert from 'node:assert/strict';
import test from 'node:test';
import { createContactHandler } from '../server/contact-handler.js';

const validBody = { name: 'Ada Lovelace', email: 'ADA@example.com', subject: 'Product demo', message: 'I would like to learn more.' };

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

async function request(body, createInquiry = async () => ({ id: '1', createdAt: new Date('2026-01-01') })) {
  let writes = 0;
  let writtenData;
  const handler = createContactHandler({
    createInquiry: async data => { writes += 1; writtenData = data; return createInquiry(data); },
    rateLimit: () => false,
  });
  const res = response();
  await handler({ method: 'POST', headers: {}, body, socket: { remoteAddress: '127.0.0.1' } }, res);
  return { res, writes, writtenData };
}

test('valid inquiry is normalized, persisted, and returns 201', async () => {
  const { res, writes, writtenData } = await request(validBody);
  assert.equal(res.statusCode, 201);
  assert.equal(writes, 1);
  assert.equal(writtenData.email, 'ada@example.com');
  assert.equal(res.payload.inquiry.id, '1');
});

test('missing required fields return field errors and are not persisted', async () => {
  const { res, writes } = await request({ name: '', email: '', subject: '', message: '' });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(Object.keys(res.payload.errors).sort(), ['email', 'message', 'name', 'subject']);
  assert.equal(writes, 0);
});

test('invalid email returns 400 and is not persisted', async () => {
  const { res, writes } = await request({ ...validBody, email: 'not-an-email' });
  assert.equal(res.statusCode, 400);
  assert.match(res.payload.errors.email, /valid email/i);
  assert.equal(writes, 0);
});

test('overlong input returns 400 and is not persisted', async () => {
  const { res, writes } = await request({ ...validBody, name: 'x'.repeat(101) });
  assert.equal(res.statusCode, 400);
  assert.match(res.payload.errors.name, /100 characters/i);
  assert.equal(writes, 0);
});

test('database failure returns a safe 500 response', async t => {
  t.mock.method(console, 'error', () => {});
  const { res, writes } = await request(validBody, async () => { throw new Error('secret database detail'); });
  assert.equal(writes, 1);
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(res.payload.error, /secret|database/i);
});

test('honeypot submission returns success without writing', async () => {
  const { res, writes } = await request({ ...validBody, website: 'https://spam.invalid' });
  assert.equal(res.statusCode, 201);
  assert.equal(writes, 0);
});
