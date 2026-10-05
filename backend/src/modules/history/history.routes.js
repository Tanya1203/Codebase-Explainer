import { Router } from 'express';
import { getUserRepos } from './history.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

// GET /api/repos — list current user's analyzed repos
router.get('/', requireAuth, getUserRepos);

export default router;
