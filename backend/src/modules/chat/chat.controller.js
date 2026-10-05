import { answerQuestion } from './chat.manager.js';
import { consumeAllowance } from '../billing/billing.manager.js';
import { logger } from '../../utils/logger.js';

export async function askQuestion(req, res) {
  try {
    const { repoId, question } = req.body;
    if (!repoId || !question) {
      return res.status(400).json({ error: 'repoId and question are required' });
    }

    const result = await answerQuestion(repoId, question);
    // Only spend the free trial / credit once a real answer came back.
    await consumeAllowance(req.userId, req.allowance.actionType, req.allowance.reason);

    res.json(result);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
}
