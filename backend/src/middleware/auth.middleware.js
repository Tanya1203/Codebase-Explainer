import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Protects routes that require login. Reads the httpOnly "session" cookie
 * (set in auth.controller.js after GitHub OAuth), verifies it, and attaches
 * `req.userId` for downstream controllers to use.
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
}
