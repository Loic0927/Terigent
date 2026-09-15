const EMAIL_MAX = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const expected = new Set(['name', 'email', 'password', 'confirmPassword']);

export function normalizeEmail(value) { return value.trim().toLowerCase(); }

export function validateRegistration(body) {
  const errors = {};
  if (Object.keys(body).some(key => !expected.has(key))) errors.form = 'Request contains unsupported fields.';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmation = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
  if (!name || Array.from(name).length > 100) errors.name = 'Name must contain 1–100 characters.';
  if (!email || email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  const passwordLength = Array.from(password).length;
  if (passwordLength < 15 || passwordLength > 128) errors.password = 'Password must contain 15–128 characters.';
  if (confirmation !== password) errors.confirmPassword = 'Passwords do not match.';
  return Object.keys(errors).length ? { valid: false, errors } : { valid: true, data: { name, email, password } };
}

export function validateLogin(body) {
  const errors = {};
  if (Object.keys(body).some(key => !['email', 'password'].includes(key))) errors.form = 'Request contains unsupported fields.';
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email) || !password || password.length > 128) errors.form = 'Email or password is incorrect.';
  return Object.keys(errors).length ? { valid: false, errors } : { valid: true, data: { email, password } };
}
