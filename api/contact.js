import { createContactHandler } from '../server/contact-handler.js';
import { createInquiry } from '../server/inquiry-repository.js';

export default createContactHandler({ createInquiry });
