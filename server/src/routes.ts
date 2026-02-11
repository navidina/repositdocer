import { Router } from 'express';
import { indexDocuments, updateProjectDocs } from './controllers/scanController';
import { searchDocuments } from './controllers/searchController';
import { getProjectDocs } from './controllers/docsController';
import { askQuestion } from './controllers/integrationController';
import { apiKeyAuth } from './middlewares/auth';

const router = Router();

// Vector Store operations
router.post('/vectors/index', indexDocuments);
router.post('/rag/search', searchDocuments);

// Project operations
router.post('/projects/:id/docs', updateProjectDocs);
router.get('/projects/:id/docs', getProjectDocs);

// Integration API (Protected)
router.post('/v1/ask', apiKeyAuth, askQuestion);

export default router;
