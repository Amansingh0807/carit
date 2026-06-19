import { loadConfig } from '../config/env';

loadConfig();

import { getDatabase, closeDatabase } from './connection';

const SCHEMA_SQL = `
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Refresh tokens table
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Activity categories enum-like constraint
  -- Categories: transportation, energy, food, shopping

  -- Activities table
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

  -- Achievements table
  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    threshold REAL NOT NULL,
    threshold_type TEXT NOT NULL CHECK(threshold_type IN ('count', 'streak', 'reduction'))
  );

  -- User achievements (many-to-many)
  CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE(user_id, achievement_id)
  );

  -- User streaks table
  CREATE TABLE IF NOT EXISTS user_streaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Composite indexes for query performance
  CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_activities_user_category ON activities(user_id, category);
  CREATE INDEX IF NOT EXISTS idx_activities_user_category_date ON activities(user_id, category, date);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
`;

const SEED_ACHIEVEMENTS_SQL = `
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
`;

function initializeDatabase(): void {
  console.log('🔧 Initializing database...');

  const db = getDatabase();

  try {
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA foreign_keys = ON;');
    console.log('✅ WAL mode and foreign keys enabled');

    // Execute schema
    const schemaStatements = SCHEMA_SQL.split(';').filter((s) => s.trim().length > 0);
    for (const statement of schemaStatements) {
      db.run(statement + ';');
    }
    console.log('✅ Database schema created');

    // Seed achievements
    db.run(SEED_ACHIEVEMENTS_SQL);
    console.log('✅ Default achievements seeded');

    // Persist the database
    closeDatabase();
    console.log('✅ Database initialized and saved successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
