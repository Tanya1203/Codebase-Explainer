import { getAllowance } from '../modules/billing/billing.manager.js';

/**
 * Gates a route behind the free-trial/credits system. Must run AFTER
 * requireAuth (needs req.userId). This only CHECKS — it does not spend
 * anything. The controller must call consumeAllowance() itself, and only
 * after the actual work succeeds (see billing.manager.js for why).
 *
 * @param {'repo'|'question'} actionType
 */
export function requireAllowance(actionType) {
  return async (req, res, next) => {
    try {
      const { allowed, reason } = await getAllowance(req.userId, actionType);

      if (!allowed) {
        return res.status(402).json({
          error: 'Free trial used up. Upgrade to continue.',
          code: 'UPGRADE_REQUIRED',
        });
      }

      req.allowance = { actionType, reason }; // controller consumes this after success
      next();
    } catch (err) {
      next(err);
    }
  };
}
