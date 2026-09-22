import { createLoginHandler, logoutHandler, sessionHandler } from '../../../server/auth-handler.js';
import * as repository from '../../../server/login-repository.js';

const loginHandler = createLoginHandler(repository);

export default function adminAuthHandler(req, res) {
  const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  if (action === 'login') return loginHandler(req, res);
  if (action === 'logout') return logoutHandler(req, res);
  if (action === 'session') return sessionHandler(req, res);
  res.setHeader('Allow', 'GET, POST');
  return res.status(404).json({ error: 'Authentication endpoint not found.' });
}
