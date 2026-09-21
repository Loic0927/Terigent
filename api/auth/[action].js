import { createUserAuthHandlers } from '../../server/user-auth-handler.js';
import * as repository from '../../server/user-repository.js';

const handlers = createUserAuthHandlers(repository);

export default function memberAuthDispatcher(req, res) {
  const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  const handler = Object.hasOwn(handlers, action) ? handlers[action] : null;
  if (typeof handler !== 'function') return res.status(404).json({ error: 'Authentication route not found.' });
  return handler(req, res);
}
