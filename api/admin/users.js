import { createAdminUsersHandler } from '../../server/admin-user-handler.js';
import * as repository from '../../server/admin-user-repository.js';

export default createAdminUsersHandler(repository);
