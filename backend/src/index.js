import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './modules/auth/auth.routes.js';
import repoRoutes from './modules/repo/repo.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import graphRoutes from './modules/graph/graph.routes.js';
import historyRoutes from './modules/history/history.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();

// credentials: true is required so the browser will send/receive our
// httpOnly session cookie cross-origin (frontend on :5173, backend on :5000)
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/repo', repoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/repos', historyRoutes);
app.use('/api/billing', billingRoutes);

// Centralized error handler — catches anything passed to next(err),
// e.g. from billing.middleware.js, and always returns JSON instead of
// Express's default HTML error page.
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Server running on http://localhost:${PORT}`));
