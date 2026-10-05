import { getBillingStatus, addCredits } from './billing.manager.js';
import { logger } from '../../utils/logger.js';

/** GET /api/billing/status — how much free/credit allowance is left. */
export async function getStatus(req, res) {
  try {
    const status = await getBillingStatus(req.userId);
    res.json(status);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/billing/upgrade — DEV STUB ONLY.
 *
 * This currently just grants credits directly on request, with NO real
 * payment verification. It exists so you can test the gating flow end to
 * end before wiring up a real payment provider. Before accepting real
 * money, replace the body of this function with a Stripe webhook handler
 * that calls addCredits() only after Stripe confirms a successful charge
 * (verified via the webhook signature) — never trust a client-supplied
 * "I paid" request like this one in production.
 */
export async function devGrantCredits(req, res) {
  try {
    const amount = Number(req.body?.amount) || 50;
    await addCredits(req.userId, amount);
    res.json({ status: 'credits_granted', amount });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
}
