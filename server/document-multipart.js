import Busboy from 'busboy';
import { MAX_FILE_BYTES, MAX_MULTIPART_BYTES } from './document-validation.js';

export function parseDocumentUpload(req) {
  return new Promise(resolve => {
    const length = Number(req.headers?.['content-length'] || 0);
    if (length > MAX_MULTIPART_BYTES) return resolve({ error: 'File too large.', status: 413 });
    if (!String(req.headers?.['content-type'] || '').toLowerCase().startsWith('multipart/form-data;')) return resolve({ error: 'Invalid upload request.', status: 400 });
    let parser;
    try { parser = Busboy({ headers: req.headers, limits: { files: 1, fields: 0, fileSize: MAX_FILE_BYTES, parts: 1 } }); }
    catch { return resolve({ error: 'Invalid upload request.', status: 400 }); }
    let total = 0, fileCount = 0, result = null, settled = false, truncated = false;
    const finish = value => { if (!settled) { settled = true; resolve(value); } };
    req.on('data', chunk => { total += chunk.length; if (total > MAX_MULTIPART_BYTES) { finish({ error: 'File too large.', status: 413 }); req.unpipe(parser); parser.destroy(); } });
    parser.on('file', (name, stream, info) => {
      fileCount += 1; const chunks = [];
      stream.on('limit', () => { truncated = true; });
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => { result = { fieldName: name, filename: info.filename, mimeType: info.mimeType, buffer: Buffer.concat(chunks) }; });
    });
    parser.on('filesLimit', () => finish({ error: 'Only one file may be uploaded.', status: 400 }));
    parser.on('partsLimit', () => { if (fileCount > 1) finish({ error: 'Only one file may be uploaded.', status: 400 }); });
    parser.on('error', () => finish({ error: 'Invalid upload request.', status: 400 }));
    parser.on('close', () => {
      if (truncated) return finish({ error: 'File too large.', status: 413 });
      if (fileCount !== 1 || !result || result.fieldName !== 'file') return finish({ error: fileCount > 1 ? 'Only one file may be uploaded.' : 'Missing file.', status: 400 });
      finish({ file: result });
    });
    req.pipe(parser);
  });
}
