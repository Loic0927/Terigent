import { randomUUID } from 'node:crypto';

const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const SAFE_CODE = /^[A-Za-z0-9_-]{1,32}$/;

export function requestId(req) {
  const supplied = Array.isArray(req?.headers?.['x-request-id'])
    ? req.headers['x-request-id'][0]
    : req?.headers?.['x-request-id'];
  return typeof supplied === 'string' && SAFE_ID.test(supplied) ? supplied : randomUUID();
}

function errorType(error) {
  if (error instanceof Error && SAFE_CODE.test(error.name || '')) return error.name;
  return 'UnknownError';
}

function errorCode(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  return SAFE_CODE.test(code) ? code : undefined;
}

export function logServerError(operation, error, req) {
  const entry = {
    level: 'error',
    operation,
    errorType: errorType(error),
    requestId: requestId(req),
  };
  const code = errorCode(error);
  if (code) entry.errorCode = code;
  console.error(JSON.stringify(entry));
  return entry.requestId;
}
