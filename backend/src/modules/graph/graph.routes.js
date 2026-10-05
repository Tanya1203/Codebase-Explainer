import { Router } from 'express';
import { getGraph } from './graph.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

// GET /api/graph/:repoId
router.get('/:repoId', requireAuth, getGraph);

export default router;
