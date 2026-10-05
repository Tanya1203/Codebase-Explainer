import { Router } from 'express';
import {
  redirectToGithub,
  handleGithubCallback,
  getCurrentUser,
  logout,
} from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/github', redirectToGithub);
router.get('/github/callback', handleGithubCallback);
router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', logout);

export default router;
