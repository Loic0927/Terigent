import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const password = process.env.ADMIN_PASSWORD || process.argv[2];
if (!password || password.length < 12) {
  console.error('Set ADMIN_PASSWORD to a password of at least 12 characters, then run this script. See README.md.');
  process.exitCode = 1;
} else {
  const salt = randomBytes(16);
  const derived = await promisify(scrypt)(password, salt, 64, { N: 16384, r: 8, p: 1 });
  console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`);
  console.log(`SESSION_SECRET=${randomBytes(48).toString('base64url')}`);
}
