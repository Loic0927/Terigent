import { createPublicCustomerRequestHandler } from '../server/customer-request-handler.js';
import * as repository from '../server/customer-request-repository.js';
export default createPublicCustomerRequestHandler(repository);
