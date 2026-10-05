import {
  buildGithubAuthorizeUrl,
  completeGithubLogin,
  getUserProfile,
  COOKIE_NAME,
  COOKIE_OPTIONS,
} from './auth.manager.js';
import { logger } from '../../utils/logger.js';

/** GET /api/auth/github — kicks off the OAuth flow by redirecting to GitHub. */
export function redirectToGithub(req, res) {
  res.redirect(buildGithubAuthorizeUrl());
}

/** GET /api/auth/github/callback — GitHub redirects here with a `code`. */
export async function handleGithubCallback(req, res) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing OAuth code');

    const sessionToken = await completeGithubLogin(code);
    res.cookie(COOKIE_NAME, sessionToken, COOKIE_OPTIONS);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    logger.error('GitHub callback failed', err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
}

/** GET /api/auth/me — used by the frontend to check "am I logged in?" */
export async function getCurrentUser(req, res) {
  const user = await getUserProfile(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

/** POST /api/auth/logout */
export function logout(req, res) {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.json({ status: 'logged_out' });
}
