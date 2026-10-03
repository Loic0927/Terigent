import { createTaskItemHandler,createTasksHandler } from '../server/task-handler.js';
import * as repository from '../server/task-repository.js';
import * as authRepository from '../server/user-repository.js';
const index=createTasksHandler(repository,authRepository);
const item=createTaskItemHandler(repository,authRepository);
export default function tasks(req,res){return req.query?.taskRoute==='item'?item(req,res):index(req,res);}
