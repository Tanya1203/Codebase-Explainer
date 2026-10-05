import { analyzeRepoFromUrl, analyzeRepoFromZip } from './repo.manager.js';
import { consumeAllowance } from '../billing/billing.manager.js';
import { logger } from '../../utils/logger.js';

/** POST /api/repo/analyze  { repoUrl }  — requires auth + allowance */
export async function analyzeRepo(req, res) {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'repoUrl is required' });

    const result = await analyzeRepoFromUrl(req.userId, repoUrl);
    // Only spend the free trial / credit once analysis genuinely succeeded.
    await consumeAllowance(req.userId, req.allowance.actionType, req.allowance.reason);

    res.json(result);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
}

/** POST /api/repo/upload-zip  (multipart/form-data, field name "file") — requires auth + allowance */
export async function uploadZipRepo(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (expected field "file")' });

    const result = await analyzeRepoFromZip(req.userId, req.file.path, req.file.originalname);
    await consumeAllowance(req.userId, req.allowance.actionType, req.allowance.reason);

    res.json(result);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
}
