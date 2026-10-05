import { createCustomerRequestsGateway } from '../server/customer-request-handler.js';
import * as repository from '../server/customer-request-repository.js';
import { createProjectGateway } from '../server/project-handler.js';
import * as projectRepository from '../server/project-repository.js';
const requests = createCustomerRequestsGateway(repository);
const management = createProjectGateway(projectRepository);
export default function gateway(req, res) { return req.query?.managementRoute ? management(req, res) : requests(req, res); }
