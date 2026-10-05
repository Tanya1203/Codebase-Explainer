import { Router } from 'express';
import { askQuestion } from './chat.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAllowance } from '../../middleware/billing.middleware.js';

const router = Router();

// POST /api/chat/ask  { repoId, question }
router.post('/ask', requireAuth, requireAllowance('question'), askQuestion);

export default router;
