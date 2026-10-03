import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = 3_400_000;
export const MAX_IMAGE_PIXELS = 25_000_000;
const allowed = new Map([
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'],
  ['.webp', 'image/webp'], ['.pdf', 'application/pdf'],
]);

export async function validateDocumentFile(file) {
  if (!file?.buffer) return { error: 'Missing file.' };
  if (!file.buffer.length) return { error: 'Empty file.' };
  if (file.buffer.length > MAX_FILE_BYTES) return { error: 'File too large.' };
  const filename = String(file.filename || '').normalize('NFC');
  const hasUnsafeCharacter = [...filename].some(character => character === '/' || character === '\\' || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
  if (!filename || filename.length > 180 || hasUnsafeCharacter || filename === '.' || filename === '..') return { error: 'Invalid filename.' };
  const extension = path.extname(filename).toLowerCase();
  const expected = allowed.get(extension);
  if (!expected) return { error: 'Unsupported file type.' };
  if (file.mimeType !== expected) return { error: 'Unsupported file type.' };
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || detected.mime !== expected) return { error: 'Invalid or corrupted file.' };
  if (expected.startsWith('image/')) {
    try {
      const metadata = await sharp(file.buffer, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' }).metadata();
      if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS) return { error: 'Invalid or corrupted file.' };
    } catch { return { error: 'Invalid or corrupted file.' }; }
  } else if (!file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) return { error: 'Invalid or corrupted file.' };
  return { data: { filename, mimeType: expected, sizeBytes: file.buffer.length, buffer: file.buffer } };
}
