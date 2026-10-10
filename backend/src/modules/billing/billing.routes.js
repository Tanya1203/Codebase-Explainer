import { Router } from 'express';
import { getStatus, createPaymentOrder, verifyPayment} from './billing.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

// GET /api/billing/status
router.get('/status', requireAuth, getStatus);


router.post('/create-order', requireAuth, createPaymentOrder);

router.post('/verify-payment', requireAuth, verifyPayment);


export default router;
