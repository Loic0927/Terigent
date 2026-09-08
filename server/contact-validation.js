export const CONTACT_LIMITS = Object.freeze({
  name: 100,
  email: 254,
  subject: 150,
  message: 5000,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value) {
  return typeof value === 'string'
    ? value.split('\u0000').join('').replace(/\r\n?/g, '\n').trim()
    : '';
}

export function validateContact(input) {
  const data = {
    name: cleanText(input?.name),
    email: cleanText(input?.email).toLowerCase(),
    subject: cleanText(input?.subject),
    message: cleanText(input?.message),
  };
  const errors = {};

  for (const field of ['name', 'email', 'subject', 'message']) {
    if (!data[field]) errors[field] = `${field[0].toUpperCase()}${field.slice(1)} is required.`;
    else if (data[field].length > CONTACT_LIMITS[field]) {
      errors[field] = `${field[0].toUpperCase()}${field.slice(1)} must be ${CONTACT_LIMITS[field]} characters or fewer.`;
    }
  }
  if (data.email && data.email.length <= CONTACT_LIMITS.email && !EMAIL_PATTERN.test(data.email)) {
    errors.email = 'Enter a valid email address.';
  }

  return { data, errors, valid: Object.keys(errors).length === 0 };
}
