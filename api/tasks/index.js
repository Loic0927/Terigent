import { createTasksHandler } from '../../server/task-handler.js';
import * as repository from '../../server/task-repository.js';
import * as authRepository from '../../server/user-repository.js';
export default createTasksHandler(repository,authRepository);
