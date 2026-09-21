export const SERVICE_LIMITS = Object.freeze({ name: 120, description: 2000, category: 80, pricingText: 120 });
export const SERVICE_FIELDS = Object.freeze(['name', 'description', 'category', 'pricingText', 'active']);

function clean(value) {
  return typeof value === 'string' ? value.split('\u0000').join('').replace(/\r\n?/g, '\n').trim() : '';
}

export function validateService(input) {
  const errors = {};
  const unsupported = input && typeof input === 'object' ? Object.keys(input).filter(key => !SERVICE_FIELDS.includes(key)) : [];
  if (unsupported.length) errors.body = `Unsupported field${unsupported.length === 1 ? '' : 's'}: ${unsupported.join(', ')}.`;

  const data = {
    name: clean(input?.name),
    description: clean(input?.description),
    category: clean(input?.category),
    pricingText: clean(input?.pricingText) || null,
    active: input?.active,
  };
  for (const field of ['name', 'description', 'category']) {
    if (!data[field]) errors[field] = `${field[0].toUpperCase()}${field.slice(1)} is required.`;
    else if (data[field].length > SERVICE_LIMITS[field]) errors[field] = `${field[0].toUpperCase()}${field.slice(1)} must be ${SERVICE_LIMITS[field]} characters or fewer.`;
  }
  if (data.pricingText && data.pricingText.length > SERVICE_LIMITS.pricingText) errors.pricingText = `Pricing must be ${SERVICE_LIMITS.pricingText} characters or fewer.`;
  if (typeof data.active !== 'boolean') errors.active = 'Availability must be true or false.';
  return { data, errors, valid: Object.keys(errors).length === 0 };
}
