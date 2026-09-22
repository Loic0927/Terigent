export const CUSTOMER_REQUEST_LIMITS = Object.freeze({ fullName: 100, email: 254, subject: 150, details: 5000 });
export const CUSTOMER_REQUEST_STATUSES = Object.freeze(['New', 'In Progress', 'Resolved', 'Closed']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = value => typeof value === 'string' ? value.replaceAll('\u0000', '').replace(/\r\n?/g, '\n').trim() : '';

export function validateCustomerRequest(input) {
  const allowed = new Set(['fullName', 'email', 'subject', 'details', 'website']);
  const data = { fullName: clean(input?.fullName), email: clean(input?.email).toLowerCase(), subject: clean(input?.subject), details: clean(input?.details) };
  const errors = {};
  for (const field of Object.keys(data)) {
    if (!data[field]) errors[field] = `${field === 'fullName' ? 'Full name' : field[0].toUpperCase() + field.slice(1)} is required.`;
    else if (data[field].length > CUSTOMER_REQUEST_LIMITS[field]) errors[field] = `Maximum ${CUSTOMER_REQUEST_LIMITS[field]} characters.`;
  }
  if (data.email && data.email.length <= CUSTOMER_REQUEST_LIMITS.email && !EMAIL_PATTERN.test(data.email)) errors.email = 'Enter a valid email address.';
  if (input && Object.keys(input).some(key => !allowed.has(key))) errors.body = 'Unexpected fields are not allowed.';
  return { data, errors, valid: Object.keys(errors).length === 0 };
}

export function validateStatusUpdate(input) {
  if (!input || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'status')) return { valid: false, errors: { body: 'Only status may be updated.' } };
  if (!CUSTOMER_REQUEST_STATUSES.includes(input.status)) return { valid: false, errors: { status: 'Select a valid status.' } };
  return { valid: true, data: { status: input.status }, errors: {} };
}
