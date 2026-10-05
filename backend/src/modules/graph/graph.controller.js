import { getGraphForRepo } from './graph.manager.js';
import { logger } from '../../utils/logger.js';

/** GET /api/graph/:repoId */
export async function getGraph(req, res) {
  try {
    const { repoId } = req.params;
    const graph = await getGraphForRepo(repoId);
    res.json(graph);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
}
