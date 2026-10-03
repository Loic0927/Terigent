import { createDocumentsHandler } from '../server/document-handler.js';
import * as repository from '../server/document-repository.js';
import * as authRepository from '../server/user-repository.js';
import * as blobs from '../server/document-blob.js';
export const config={api:{bodyParser:false}};
export default createDocumentsHandler(repository,authRepository,blobs);
