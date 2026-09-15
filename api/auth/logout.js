import { createUserAuthHandlers } from '../../server/user-auth-handler.js';
import * as repository from '../../server/user-repository.js';
export default createUserAuthHandlers(repository).logout;
