export const SERVICE_LIMITS = Object.freeze({ name: 120, description: 2000, category: 80, pricingText: 120 });
export const SERVICE_FIELDS = Object.freeze(['name', 'description', 'category', 'pricingText', 'active']);
export const PUBLIC_SERVICE_SORTS = Object.freeze(['updated_desc', 'updated_asc']);
export const PUBLIC_SERVICE_SEARCH_LIMITS = Object.freeze({ query: 100, category: 80, pageSize: 24, maxPageSize: 50 });

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

function singleQueryValue(value) {
  return Array.isArray(value) ? null : value;
}

export function validatePublicServiceQuery(query = {}) {
  const allowed = ['q', 'category', 'sort', 'page', 'limit'];
  const unsupported = Object.keys(query).filter(key => !allowed.includes(key));
  const qValue = singleQueryValue(query.q);
  const categoryValue = singleQueryValue(query.category);
  const sortValue = singleQueryValue(query.sort);
  const pageValue = singleQueryValue(query.page);
  const limitValue = singleQueryValue(query.limit);
  const q = clean(qValue);
  const category = clean(categoryValue);
  const sort = clean(sortValue) || 'updated_desc';
  const page = pageValue === undefined || pageValue === '' ? 1 : Number(pageValue);
  const limit = limitValue === undefined || limitValue === '' ? PUBLIC_SERVICE_SEARCH_LIMITS.pageSize : Number(limitValue);
  const errors = {};

  if (unsupported.length) errors.query = `Unsupported query parameter${unsupported.length === 1 ? '' : 's'}: ${unsupported.join(', ')}.`;
  if ([query.q, query.category, query.sort, query.page, query.limit].some(Array.isArray)) errors.query = 'Query parameters must have a single value.';
  if (q.length > PUBLIC_SERVICE_SEARCH_LIMITS.query) errors.q = `Search must be ${PUBLIC_SERVICE_SEARCH_LIMITS.query} characters or fewer.`;
  if (category.length > PUBLIC_SERVICE_SEARCH_LIMITS.category) errors.category = `Category must be ${PUBLIC_SERVICE_SEARCH_LIMITS.category} characters or fewer.`;
  if (!PUBLIC_SERVICE_SORTS.includes(sort)) errors.sort = `Sort must be one of: ${PUBLIC_SERVICE_SORTS.join(', ')}.`;
  if (!Number.isSafeInteger(page) || page < 1) errors.page = 'Page must be a positive integer.';
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > PUBLIC_SERVICE_SEARCH_LIMITS.maxPageSize) errors.limit = `Limit must be between 1 and ${PUBLIC_SERVICE_SEARCH_LIMITS.maxPageSize}.`;

  return { data: { q, category, sort, page, limit }, errors, valid: Object.keys(errors).length === 0 };
}
