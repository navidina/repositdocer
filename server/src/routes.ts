import { Router } from 'express';
import { indexDocuments, updateProjectDocs } from './controllers/scanController';
import { searchDocuments } from './controllers/searchController';
import { getProjectDocs } from './controllers/docsController';

const router = Router();

// Vector Store operations
router.post('/vectors/index', indexDocuments);
router.post('/rag/search', searchDocuments);

// Project operations
router.post('/projects/:id/docs', updateProjectDocs);
router.get('/projects/:id/docs', getProjectDocs);

// Optional: Combined scan endpoint if needed (as per prompt description)
// router.post('/projects/scan', scanProject);

export default router;
