import { createLoginHandler } from '../../../server/auth-handler.js';
import * as repository from '../../../server/login-repository.js';
export default createLoginHandler(repository);
