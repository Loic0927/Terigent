import { createAdminServicesHandler } from '../../../server/service-handler.js';
import * as repository from '../../../server/service-repository.js';

export default createAdminServicesHandler(repository);
