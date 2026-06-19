import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: SqlJsDatabase | null = null;

function getDbPath(): string {
  const dbPath = process.env['DB_PATH'] || './data/carbon_footprint.db';
  return path.resolve(dbPath);
}

function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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

export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function saveDatabase(): void {
  if (!db) return;

  const dbPath = getDbPath();
  ensureDirectoryExists(dbPath);
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Auto-save periodically (every 30 seconds)
let saveInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSave(intervalMs: number = 30000): void {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    try {
      saveDatabase();
    } catch (_error) {
      console.error('Auto-save failed');
    }
  }, intervalMs);
}

export function stopAutoSave(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
}

// For testing: reset the database instance
export function resetDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
