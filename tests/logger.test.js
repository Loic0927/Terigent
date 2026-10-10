import assert from 'node:assert/strict';
import test from 'node:test';
import { logServerError } from '../server/logger.js';

test('safe logger never emits exception messages, stacks, tokens, cookies, URLs, or connection strings', t => {
  const output = [];
  t.mock.method(console, 'error', value => output.push(String(value)));
  const secret = 'postgresql://user:password@private.example/db token=secret cookie=session blob=https://blob.example/private';
  const error = Object.assign(new Error(secret), { code: 'XX001', stack: `Error: ${secret}` });
  logServerError('test.database.failure', error, { headers: { 'x-request-id': 'request-safe-123', cookie: 'session=private' } });
  assert.equal(output.length, 1);
  const entry = JSON.parse(output[0]);
  assert.deepEqual(entry, { level: 'error', operation: 'test.database.failure', errorType: 'Error', requestId: 'request-safe-123', errorCode: 'XX001' });
  assert.doesNotMatch(output[0], /password|private\.example|token|cookie|blob\.example|session=private/i);
});

test('unsafe incoming request IDs are replaced instead of logged', t => {
  const output = [];
  t.mock.method(console, 'error', value => output.push(String(value)));
  logServerError('test.request-id', new TypeError('safe'), { headers: { 'x-request-id': 'token=do-not-log\nsecret' } });
  const entry = JSON.parse(output[0]);
  assert.equal(entry.errorType, 'TypeError');
  assert.match(entry.requestId, /^[0-9a-f-]{36}$/);
  assert.doesNotMatch(output[0], /do-not-log|secret/);
});
