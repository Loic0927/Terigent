import { validateContact } from './contact-validation.js';

const MAX_BODY_BYTES = 12_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const attempts = new Map();

function clientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

function isRateLimited(ip, now) {
  const active = (attempts.get(ip) || []).filter(time => now - time < WINDOW_MS);
  active.push(now);
  attempts.set(ip, active);
  if (attempts.size > 1000) {
    for (const [key, times] of attempts) if (!times.some(time => now - time < WINDOW_MS)) attempts.delete(key);
  }
  return active.length > MAX_REQUESTS;
}

function send(res, status, payload) {
  res.status(status).json(payload);
}

export function createContactHandler({ createInquiry, now = Date.now, rateLimit = isRateLimited }) {
  return async function contactHandler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return send(res, 405, { error: 'Method not allowed.' });
    }

    const contentLength = Number(req.headers?.['content-length'] || 0);
    if (contentLength > MAX_BODY_BYTES) return send(res, 413, { error: 'Request is too large.' });
    if (rateLimit(clientIp(req), now())) return send(res, 429, { error: 'Too many requests. Please try again shortly.' });

    const body = typeof req.body === 'string' ? safelyParse(req.body) : req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return send(res, 400, { error: 'Invalid request body.' });
    }
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
      return send(res, 413, { error: 'Request is too large.' });
    }
    // Hidden field: bots commonly fill it, humans never see it.
    if (typeof body.website === 'string' && body.website.trim()) {
      return send(res, 201, { message: 'Thanks. Your inquiry has been received.' });
    }

    const result = validateContact(body);
    if (!result.valid) return send(res, 400, { error: 'Please correct the highlighted fields.', errors: result.errors });

    try {
      const inquiry = await createInquiry(result.data);
      return send(res, 201, {
        message: 'Thanks. Your inquiry has been received.',
        inquiry: { id: inquiry.id, createdAt: inquiry.createdAt },
      });
    } catch (error) {
      console.error('Contact inquiry persistence failed:', error instanceof Error ? error.message : 'Unknown error');
      return send(res, 500, { error: 'We could not send your inquiry right now. Please try again later.' });
    }
  };
}

function safelyParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}
