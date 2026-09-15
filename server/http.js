export function send(res, status, payload) { return res.status(status).json(payload); }

export function parseBody(req, maxBytes = 12_000) {
  const contentLength = Number(req.headers?.['content-length'] || 0);
  if (contentLength > maxBytes) return { error: 'too_large' };
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return { error: 'invalid' }; }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'invalid' };
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > maxBytes) return { error: 'too_large' };
  return { body };
}

export function clientIp(req) {
  const realIp = req.headers?.['x-real-ip'];
  const forwarded = process.env.VERCEL ? req.headers?.['x-forwarded-for'] : null;
  return ((Array.isArray(realIp) ? realIp[0] : realIp) || (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0] || req.socket?.remoteAddress || 'unknown').trim();
}
