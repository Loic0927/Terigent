import { del, get, put } from '@vercel/blob';
const options = { access: 'private' };
export const uploadBlob = (key, buffer, contentType) => put(key, buffer, { ...options, contentType, addRandomSuffix: false, cacheControlMaxAge: 60 });
export const getBlob = key => get(key, options);
export const deleteBlob = key => del(key, options);
