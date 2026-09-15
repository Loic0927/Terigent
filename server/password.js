import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const OPTIONS = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, OPTIONS);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  try {
    const [scheme, salt, expected] = String(encoded).split('$');
    if (scheme !== 'scrypt' || !salt || !expected) return false;
    const expectedBuffer = Buffer.from(expected, 'base64url');
    if (expectedBuffer.length !== 64) return false;
    const actual = await scryptAsync(password, Buffer.from(salt, 'base64url'), 64, OPTIONS);
    return timingSafeEqual(expectedBuffer, actual);
  } catch { return false; }
}
