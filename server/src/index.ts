import { loadConfig } from './config/env';

// Load environment variables before anything else
loadConfig();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { getConfig } from './config/env';
import { initDatabase, startAutoSave, closeDatabase, stopAutoSave, getDatabase, saveDatabase } from './database/connection';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/authRoutes';
import activityRoutes from './routes/activityRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import gamificationRoutes from './routes/gamificationRoutes';

async function bootstrap(): Promise<void> {
  const config = getConfig();

  // Auto-detect Render hosting to force production environment
  if (process.env.RENDER === 'true') {
    config.nodeEnv = 'production';
  }

  console.log('🌍 Carbon Footprint Platform - Server');
  console.log(`📋 Environment: ${config.nodeEnv}`);

  // ===== Initialize Database =====
  await initDatabase();
  console.log('✅ Database connected');

  // Run schema migrations
  const db = getDatabase();

  const SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('transportation', 'energy', 'food', 'shopping')),
      activity_type TEXT NOT NULL,
      value REAL NOT NULL CHECK(value > 0),
      unit TEXT NOT NULL,
      co2_kg REAL NOT NULL CHECK(co2_kg >= 0),
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL,
      threshold REAL NOT NULL,
      threshold_type TEXT NOT NULL CHECK(threshold_type IN ('count', 'streak', 'reduction'))
    );
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id INTEGER NOT NULL,
      earned_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE(user_id, achievement_id)
    );
    CREATE TABLE IF NOT EXISTS user_streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_activity_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  const schemaStatements = SCHEMA_SQL.split(';').filter((s) => s.trim().length > 0);
  for (const statement of schemaStatements) {
    db.run(statement + ';');
  }

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, date);');
  db.run('CREATE INDEX IF NOT EXISTS idx_activities_user_category ON activities(user_id, category);');
  db.run('CREATE INDEX IF NOT EXISTS idx_activities_user_category_date ON activities(user_id, category, date);');
  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);');
  db.run('CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);');

  // Seed achievements
  db.run(`
    INSERT OR IGNORE INTO achievements (name, description, icon, category, threshold, threshold_type) VALUES
      ('First Step', 'Log your first activity', '🌱', 'general', 1, 'count'),
      ('Week Warrior', 'Maintain a 7-day logging streak', '🔥', 'streak', 7, 'streak'),
      ('Month Master', 'Maintain a 30-day logging streak', '⭐', 'streak', 30, 'streak'),
      ('Eco Explorer', 'Log 10 activities', '🌍', 'general', 10, 'count'),
      ('Carbon Cutter', 'Log 50 activities', '✂️', 'general', 50, 'count'),
      ('Green Commuter', 'Log 10 transportation activities', '🚲', 'transportation', 10, 'count'),
      ('Energy Saver', 'Log 10 energy activities', '💡', 'energy', 10, 'count'),
      ('Mindful Eater', 'Log 10 food activities', '🥗', 'food', 10, 'count'),
      ('Conscious Consumer', 'Log 10 shopping activities', '🛍️', 'shopping', 10, 'count'),
      ('Century Club', 'Log 100 activities total', '💯', 'general', 100, 'count');
  `);

  // Seed demo user
  const userCheck = db.exec("SELECT id FROM users WHERE email = 'demo@example.com'");
  if (userCheck.length === 0 || userCheck[0].values.length === 0) {
    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync('Password123!', salt);
    db.run(
      "INSERT INTO users (email, username, password_hash) VALUES ('demo@example.com', 'demo_user', ?)",
      [hash]
    );
    // Get the created user ID
    const demoUser = db.exec("SELECT id FROM users WHERE email = 'demo@example.com'");
    if (demoUser.length > 0 && demoUser[0].values.length > 0) {
      const demoUserId = demoUser[0].values[0][0];
      // Seed default streak
      db.run(
        "INSERT OR IGNORE INTO user_streaks (user_id, current_streak, longest_streak) VALUES (?, 0, 0)",
        [demoUserId]
      );
    }
    console.log('🌱 Seeded Demo User: demo@example.com / Password123!');
  }

  saveDatabase();
  console.log('✅ Schema and seeds applied');

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
    console.log(`📁 Static serving: ENABLED`);
    console.log(`📁 Serving client assets from: ${clientDistPath}`);
    
    app.use(express.static(clientDistPath));
    
    // Catch-all route to serve the React index.html for clientside routing
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
        if (err) {
          console.error('❌ Failed to serve index.html:', err);
          res.status(500).send('Frontend asset loading failed. Check server logs.');
        }
      });
    });
  } else {
    console.log('⚠️ Static serving: DISABLED (NODE_ENV is not production)');
  }

  // ===== Error Handling =====
  app.use(errorHandler);

  // ===== Start Server =====
  app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
    console.log(`📡 API available at http://localhost:${config.port}/api`);
  });

  // ===== Graceful Shutdown =====
  const shutdown = (): void => {
    console.log('\n🛑 Shutting down gracefully...');
    stopAutoSave();
    closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
