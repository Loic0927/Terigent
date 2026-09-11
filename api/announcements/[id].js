import { createAnnouncementItemHandler } from '../../server/announcement-handler.js';
import * as repository from '../../server/announcement-repository.js';

export default createAnnouncementItemHandler(repository);
