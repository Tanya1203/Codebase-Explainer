import { Router } from 'express';
import { analyzeRepo, uploadZipRepo } from './repo.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAllowance } from '../../middleware/billing.middleware.js';
import upload from '../../middleware/upload.middleware.js';

const router = Router();

// POST /api/repo/analyze  { repoUrl }
router.post('/analyze', requireAuth, requireAllowance('repo'), analyzeRepo);

// POST /api/repo/upload-zip  (multipart/form-data, field name "file")
router.post('/upload-zip', requireAuth, upload.single('file'), requireAllowance('repo'), uploadZipRepo);

export default router;
