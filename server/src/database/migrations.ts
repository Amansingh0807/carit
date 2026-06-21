/**
 * @module migrations
 * @description Database schema migrations and seed data for the Carbon Footprint Platform.
 *
 * Extracted from `index.ts` to keep the bootstrap file lean and focused on
 * server orchestration.  All DDL (`CREATE TABLE`, `CREATE INDEX`) and seed
 * operations (`INSERT` for achievements and demo user) live here.
 */

import type { Database as SqlJsDatabase } from 'sql.js';
import bcrypt from 'bcryptjs';
import { logger } from '../config/logger';

// ────────────────────────────────────────────────────────────────────────────
// Schema DDL
// ────────────────────────────────────────────────────────────────────────────

/** Core table definitions — idempotent via `CREATE TABLE IF NOT EXISTS`. */
const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS activities (
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
  )`,
  `CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    threshold REAL NOT NULL,
    threshold_type TEXT NOT NULL CHECK(threshold_type IN ('count', 'streak', 'reduction'))
  )`,
  `CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE(user_id, achievement_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_streaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
];

/** Performance indexes — idempotent via `CREATE INDEX IF NOT EXISTS`. */
const INDEX_STATEMENTS: string[] = [
  'CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, date)',
  'CREATE INDEX IF NOT EXISTS idx_activities_user_category ON activities(user_id, category)',
  'CREATE INDEX IF NOT EXISTS idx_activities_user_category_date ON activities(user_id, category, date)',
  'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)',
  'CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id)',
];

// ────────────────────────────────────────────────────────────────────────────
// Seed Data
// ────────────────────────────────────────────────────────────────────────────

/** Default achievement definitions inserted on first run. */
const ACHIEVEMENT_SEED_SQL = `
  INSERT OR IGNORE INTO achievements (name, description, icon, category, threshold, threshold_type) VALUES
    ('First Step',          'Log your first activity',               'leaf',       'general',        1,   'count'),
    ('Week Warrior',        'Maintain a 7-day logging streak',       'flame',      'streak',         7,   'streak'),
    ('Month Master',        'Maintain a 30-day logging streak',      'star',       'streak',         30,  'streak'),
    ('Eco Explorer',        'Log 10 activities',                     'globe',      'general',        10,  'count'),
    ('Carbon Cutter',       'Log 50 activities',                     'scissors',   'general',        50,  'count'),
    ('Green Commuter',      'Log 10 transportation activities',      'bike',       'transportation', 10,  'count'),
    ('Energy Saver',        'Log 10 energy activities',              'lightbulb',  'energy',         10,  'count'),
    ('Mindful Eater',       'Log 10 food activities',                'salad',      'food',           10,  'count'),
    ('Conscious Consumer',  'Log 10 shopping activities',            'bag',        'shopping',       10,  'count'),
    ('Century Club',        'Log 100 activities total',              'hundred',    'general',        100, 'count')
`;

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Execute all schema DDL statements and create performance indexes.
 * Safe to call multiple times — all statements are idempotent.
 *
 * @param db - An initialised sql.js `Database` instance.
 */
export function runMigrations(db: SqlJsDatabase): void {
  for (const statement of SCHEMA_STATEMENTS) {
    db.run(statement + ';');
  }
  for (const statement of INDEX_STATEMENTS) {
    db.run(statement + ';');
  }
  logger.info('Database schema migrations applied');
}

/**
 * Insert seed data (achievements and optional demo user).
 * Uses `INSERT OR IGNORE` so re-runs are safe.
 *
 * @param db - An initialised sql.js `Database` instance.
 * @param options - Seed options.
 * @param options.seedDemoUser - If `true`, creates `demo@example.com` with password `Password123!`.
 * @param options.bcryptRounds - Number of bcrypt rounds for the demo user hash (default: 12).
 */
export async function seedData(
  db: SqlJsDatabase,
  options: { seedDemoUser?: boolean; bcryptRounds?: number } = {}
): Promise<void> {
  const { seedDemoUser = true, bcryptRounds = 12 } = options;

  // Seed achievements
  db.run(ACHIEVEMENT_SEED_SQL);
  logger.info('Achievement seed data applied');

  // Seed demo user
  if (seedDemoUser) {
    const userCheck = db.exec("SELECT id FROM users WHERE email = 'demo@example.com'");
    if (userCheck.length === 0 || userCheck[0].values.length === 0) {
      const salt = bcrypt.genSaltSync(bcryptRounds);
      const hash = bcrypt.hashSync('Password123!', salt);
      db.run(
        "INSERT INTO users (email, username, password_hash) VALUES ('demo@example.com', 'demo_user', ?)",
        [hash]
      );

      const demoUser = db.exec("SELECT id FROM users WHERE email = 'demo@example.com'");
      if (demoUser.length > 0 && demoUser[0].values.length > 0) {
        const demoUserId = demoUser[0].values[0][0];
        db.run(
          'INSERT OR IGNORE INTO user_streaks (user_id, current_streak, longest_streak) VALUES (?, 0, 0)',
          [demoUserId]
        );
      }
      logger.info('Seeded demo user', { email: 'demo@example.com', password: 'Password123!' });
    }
  }
}
