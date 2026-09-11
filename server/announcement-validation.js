export const ANNOUNCEMENT_LIMITS = Object.freeze({ title: 100, content: 5000 });

function clean(value) {
  return typeof value === 'string'
    ? value.split('\u0000').join('').replace(/\r\n?/g, '\n').trim()
    : '';
}

export function validateAnnouncement(input) {
  const data = { title: clean(input?.title), content: clean(input?.content) };
  const errors = {};
  for (const field of ['title', 'content']) {
    if (!data[field]) errors[field] = `${field === 'title' ? 'Title' : 'Content'} is required.`;
    else if (data[field].length > ANNOUNCEMENT_LIMITS[field]) {
      errors[field] = `${field === 'title' ? 'Title' : 'Content'} must be ${ANNOUNCEMENT_LIMITS[field]} characters or fewer.`;
    }
  }
  return { data, errors, valid: Object.keys(errors).length === 0 };
}
