import { listUserRepos } from './history.manager.js';
import { logger } from '../../utils/logger.js';

/** GET /api/repos — the logged-in user's history, for the dashboard. */
export async function getUserRepos(req, res) {
  try {
    const repos = await listUserRepos(req.userId);
    res.json(repos);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
}
