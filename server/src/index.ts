/**
 * @module index
 * @description Bootstrap entry point for the Carbon Footprint Platform server.
 *
 * Responsibilities:
 * 1. Load environment configuration
 * 2. Initialise and migrate the SQLite database
 * 3. Configure Express middleware stack (security, parsing, CORS)
 * 4. Mount API route handlers
 * 5. Serve static client assets in production
 * 6. Register graceful shutdown hooks
 */

import { loadConfig } from './config/env';

// Load environment variables before anything else
loadConfig();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { getConfig } from './config/env';
import { logger } from './config/logger';
import { initDatabase, startAutoSave, closeDatabase, stopAutoSave, getDatabase, saveDatabase } from './database/connection';
import { runMigrations, seedData } from './database/migrations';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/authRoutes';
import activityRoutes from './routes/activityRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import gamificationRoutes from './routes/gamificationRoutes';

/**
 * Application bootstrap sequence.
 *
 * Initialises all subsystems in the correct order and starts the HTTP server.
 * Any fatal error during startup will terminate the process with exit code 1.
 */
async function bootstrap(): Promise<void> {
  const config = getConfig();

  // Auto-detect Render hosting to force production environment
  if (process.env['RENDER'] === 'true') {
    config.nodeEnv = 'production';
  }

  logger.info('Carbon Footprint Platform - Server starting');
  logger.info(`Environment: ${config.nodeEnv}`);

  // ===== Initialize Database =====
  await initDatabase();
  logger.info('Database connected');

  // Run schema migrations and seed data
  const db = getDatabase();
  runMigrations(db);
  await seedData(db, { seedDemoUser: true, bcryptRounds: config.bcryptRounds });
  saveDatabase();
  logger.info('Schema and seeds applied');

  // Start auto-save for sql.js persistence
  startAutoSave();

  // ===== Create Express App =====
  const app = express();

  // ===== Security Middleware =====

  // Helmet — sets various security HTTP headers
  app.use(helmet());

  // CORS — whitelist the frontend origin
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Rate Limiting — 100 requests per 15 minutes per IP
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
    },
  });
  app.use('/api', limiter);

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // ===== API Routes =====
  app.use('/api/auth', authRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/recommendations', recommendationRoutes);
  app.use('/api/gamification', gamificationRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  // Serve static assets in production
  if (config.nodeEnv === 'production') {
    const path = require('path');
    const clientDistPath = path.resolve(__dirname, '../../client/dist');
    logger.info('Static serving: ENABLED', { path: clientDistPath });

    app.use(express.static(clientDistPath));

    // Catch-all route to serve the React index.html for client-side routing
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'), (err: Error | null) => {
        if (err) {
          logger.error('Failed to serve index.html', err);
          res.status(500).send('Frontend asset loading failed. Check server logs.');
        }
      });
    });
  } else {
    logger.info('Static serving: DISABLED (development mode)');
  }

  // ===== Error Handling =====
  app.use(errorHandler);

  // ===== Start Server =====
  app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port}`);
    logger.info(`API available at http://localhost:${config.port}/api`);
  });

  // ===== Graceful Shutdown =====
  const shutdown = (): void => {
    logger.info('Shutting down gracefully...');
    stopAutoSave();
    closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
