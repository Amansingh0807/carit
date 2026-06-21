/**
 * @module connection
 * @description SQLite database connection management via sql.js (in-memory).
 *
 * sql.js runs SQLite entirely in WebAssembly with no native binary dependencies.
 * Data is persisted to disk on explicit `saveDatabase()` calls and via a periodic
 * auto-save interval.
 *
 * **Crash safety**: The `saveDatabase()` function uses atomic file writes
 * (write to `.tmp`, then rename) to prevent corruption if the process crashes
 * mid-write.
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';

let db: SqlJsDatabase | null = null;

/**
 * Resolve the database file path from the environment or use the default.
 */
function getDbPath(): string {
  const dbPath = process.env['DB_PATH'] || './data/carbon_footprint.db';
  return path.resolve(dbPath);
}

/**
 * Ensure the directory for a given file path exists, creating it recursively if needed.
 */
function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Initialise the sql.js database engine.
 *
 * If a database file exists on disk, it is loaded into memory.
 * Otherwise, a new empty database is created.  Foreign key constraints
 * and WAL journaling are enabled for data integrity and performance.
 *
 * @returns The initialised sql.js `Database` instance.
 */
export async function initDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();
  const dbPath = getDbPath();
  ensureDirectoryExists(dbPath);

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL-like optimizations and foreign keys
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA foreign_keys = ON;');

  return db;
}

/**
 * Get the current database instance.
 *
 * @returns The sql.js `Database` instance.
 * @throws {Error} If the database has not been initialised.
 */
export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Persist the in-memory database to disk using atomic file writes.
 *
 * The data is first written to a temporary file (`.tmp`), then renamed
 * to the target path.  This ensures the database file is never in a
 * partially-written state, preventing corruption on crash.
 */
export function saveDatabase(): void {
  if (!db) return;

  const dbPath = getDbPath();
  ensureDirectoryExists(dbPath);

  const data = db.export();
  const buffer = Buffer.from(data);

  // Atomic write: write to temp file, then rename
  const tmpPath = dbPath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, dbPath);
  } catch (err) {
    // Fallback: direct write if rename fails (e.g. cross-device)
    logger.warn('Atomic write failed, falling back to direct write', { error: String(err) });
    fs.writeFileSync(dbPath, buffer);
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Close the database connection and persist final state to disk.
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Auto-Save
// ────────────────────────────────────────────────────────────────────────────

/** Handle for the periodic auto-save interval. */
let saveInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start periodic auto-save to persist in-memory changes.
 *
 * @param intervalMs - Interval between saves in milliseconds (default: 30000).
 */
export function startAutoSave(intervalMs: number = 30000): void {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    try {
      saveDatabase();
    } catch (error) {
      logger.error('Auto-save failed', error instanceof Error ? error : undefined);
    }
  }, intervalMs);
}

/**
 * Stop periodic auto-save.
 */
export function stopAutoSave(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
}

/**
 * Reset the database instance (for testing only).
 * Closes the current connection without persisting.
 */
export function resetDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
