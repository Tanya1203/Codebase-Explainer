import { Router } from 'express';
import { getStatus, devGrantCredits } from './billing.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

// GET /api/billing/status
router.get('/status', requireAuth, getStatus);

// POST /api/billing/upgrade — DEV STUB, see billing.controller.js warning
router.post('/upgrade', requireAuth, devGrantCredits);

export default router;
