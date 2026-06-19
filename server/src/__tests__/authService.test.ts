import fs from 'fs';
import path from 'path';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  revokeRefreshToken,
  getUserById,
  ConflictError,
  UnauthorizedError,
} from '../services/authService';
import { initDatabase, closeDatabase, getDatabase, resetDatabase } from '../database/connection';

const TEST_DB_PATH = './data/test_auth_service.db';

describe('Auth Service & Connection', () => {
  beforeAll(async () => {
    // Setup test environment variables
    process.env['DB_PATH'] = TEST_DB_PATH;
    process.env['JWT_ACCESS_SECRET'] = 'test_access_secret_123456789_test';
    process.env['JWT_REFRESH_SECRET'] = 'test_refresh_secret_123456789_test';
    process.env['JWT_ACCESS_EXPIRY'] = '15m';
    process.env['JWT_REFRESH_EXPIRY'] = '7d';
    process.env['BCRYPT_ROUNDS'] = '4'; // Faster rounds for testing

    // Remove existing test DB if any
    const resolvedPath = path.resolve(TEST_DB_PATH);
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }

    // Initialize database
    resetDatabase();
    await initDatabase();
    const db = getDatabase();

    // Setup basic tables for testing
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
  });

  afterAll(() => {
    closeDatabase();
    resetDatabase();

    // Clean up test DB file
    const resolvedPath = path.resolve(TEST_DB_PATH);
    if (fs.existsSync(resolvedPath)) {
      try {
        fs.unlinkSync(resolvedPath);
      } catch (err) {
        console.error('Failed to delete test database file:', err);
      }
    }
  });

  let registeredUserId: number;
  let testRefreshToken: string;

  test('should register a new user successfully', async () => {
    const result = await registerUser('eco@earth.org', 'eco_user', 'Pass1234!');
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('eco@earth.org');
    expect(result.user.username).toBe('eco_user');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    
    registeredUserId = result.user.id;
    testRefreshToken = result.tokens.refreshToken;
  });

  test('should throw ConflictError when email is already registered', async () => {
    await expect(
      registerUser('eco@earth.org', 'another_username', 'Pass1234!')
    ).rejects.toThrow(ConflictError);
  });

  test('should retrieve user details by ID', () => {
    const user = getUserById(registeredUserId);
    expect(user).toBeDefined();
    expect(user?.email).toBe('eco@earth.org');
    expect(user?.username).toBe('eco_user');
  });

  test('should login user with correct credentials', async () => {
    const result = await loginUser('eco@earth.org', 'Pass1234!');
    expect(result.user.username).toBe('eco_user');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
  });

  test('should throw UnauthorizedError with incorrect password during login', async () => {
    await expect(
      loginUser('eco@earth.org', 'WrongPass123!')
    ).rejects.toThrow(UnauthorizedError);
  });

  test('should refresh tokens when valid refresh token is passed', () => {
    const refreshed = refreshAccessToken(testRefreshToken);
    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.refreshToken).toBeDefined();
  });

  test('should revoke refresh token', () => {
    expect(() => {
      revokeRefreshToken(testRefreshToken);
    }).not.toThrow();
  });
});
