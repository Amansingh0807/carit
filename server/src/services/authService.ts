/**
 * @module authService
 * @description Authentication and authorisation service handling user registration,
 * login, JWT token generation/verification, and refresh token lifecycle management.
 *
 * Security features:
 * - bcrypt password hashing with configurable rounds
 * - Short-lived access tokens + long-lived refresh tokens
 * - Automatic cleanup of expired refresh tokens
 * - Token rotation on refresh (old token revoked, new pair issued)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase, saveDatabase } from '../database/connection';
import { getConfig } from '../config/env';
import { parseExpiryToSeconds, parseExpiryToMs } from '../utils/duration';
import type { User, UserPublic, AuthTokens, TokenPayload } from '../types';

// ────────────────────────────────────────────────────────────────────────────
// Password Utilities
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hash a plaintext password using bcrypt with the configured number of rounds.
 *
 * @param password - The plaintext password to hash.
 * @returns A promise resolving to the bcrypt hash string.
 */
export function hashPassword(password: string): Promise<string> {
  const config = getConfig();
  return bcrypt.hash(password, config.bcryptRounds);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 *
 * @param password - The plaintext password to verify.
 * @param hash - The bcrypt hash to compare against.
 * @returns A promise resolving to `true` if the password matches.
 */
export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ────────────────────────────────────────────────────────────────────────────
// JWT Token Management
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generate a matched pair of JWT access and refresh tokens.
 *
 * @param payload - Token payload containing `userId` and `email`.
 * @returns An object with `accessToken` and `refreshToken` strings.
 */
export function generateTokens(payload: TokenPayload): AuthTokens {
  const config = getConfig();

  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: parseExpiryToSeconds(config.jwt.accessExpiry),
    jwtid: Math.random().toString(36).substring(2) + Date.now().toString(36),
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: parseExpiryToSeconds(config.jwt.refreshExpiry),
    jwtid: Math.random().toString(36).substring(2) + Date.now().toString(36),
  });

  return { accessToken, refreshToken };
}

/**
 * Verify and decode a JWT access token.
 *
 * @param token - The access token string.
 * @returns The decoded token payload.
 * @throws {JsonWebTokenError} If the token is invalid or expired.
 */
export function verifyAccessToken(token: string): TokenPayload {
  const config = getConfig();
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
}

/**
 * Verify and decode a JWT refresh token.
 *
 * @param token - The refresh token string.
 * @returns The decoded token payload.
 * @throws {JsonWebTokenError} If the token is invalid or expired.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const config = getConfig();
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}

// ────────────────────────────────────────────────────────────────────────────
// User Data Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Strip sensitive fields (password_hash, updated_at) from a user record.
 *
 * @param user - The full user record from the database.
 * @returns A safe-to-serialise public user object.
 */
export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: user.created_at,
  };
}

/**
 * Parse a raw database row into a `User` object.
 */
function rowToUser(row: (string | number | Uint8Array | null)[]): User {
  return {
    id: row[0] as number,
    email: row[1] as string,
    username: row[2] as string,
    password_hash: row[3] as string,
    created_at: row[4] as string,
    updated_at: row[5] as string,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Core Auth Operations
// ────────────────────────────────────────────────────────────────────────────

/**
 * Register a new user account.
 *
 * @param email - User's email address (must be unique).
 * @param username - Desired username (must be unique).
 * @param password - Plaintext password (will be hashed).
 * @returns The new user's public profile and authentication tokens.
 * @throws {ConflictError} If the email or username is already taken.
 */
export async function registerUser(
  email: string,
  username: string,
  password: string
): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const db = getDatabase();

  // Check for existing email
  const existingEmail = db.exec('SELECT id FROM users WHERE email = ?', [email]);
  if (existingEmail.length > 0 && existingEmail[0].values.length > 0) {
    throw new ConflictError('Email already registered');
  }

  // Check for existing username
  const existingUsername = db.exec('SELECT id FROM users WHERE username = ?', [username]);
  if (existingUsername.length > 0 && existingUsername[0].values.length > 0) {
    throw new ConflictError('Username already taken');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Insert user
  db.run(
    'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
    [email, username, passwordHash]
  );

  // Get the created user
  const result = db.exec(
    'SELECT id, email, username, password_hash, created_at, updated_at FROM users WHERE email = ?',
    [email]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Failed to create user');
  }

  const user = rowToUser(result[0].values[0]);

  // Initialize streak record
  db.run(
    'INSERT INTO user_streaks (user_id, current_streak, longest_streak) VALUES (?, 0, 0)',
    [user.id]
  );

  saveDatabase();

  // Generate tokens
  const tokens = generateTokens({ userId: user.id, email: user.email });

  // Store refresh token
  storeRefreshToken(user.id, tokens.refreshToken);

  return { user: toPublicUser(user), tokens };
}

/**
 * Authenticate a user with email and password.
 *
 * @param email - User's email address.
 * @param password - Plaintext password to verify.
 * @returns The user's public profile and new authentication tokens.
 * @throws {UnauthorizedError} If credentials are invalid.
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const db = getDatabase();

  const result = db.exec(
    'SELECT id, email, username, password_hash, created_at, updated_at FROM users WHERE email = ?',
    [email]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const user = rowToUser(result[0].values[0]);

  // Verify password
  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate tokens
  const tokens = generateTokens({ userId: user.id, email: user.email });

  // Store refresh token
  storeRefreshToken(user.id, tokens.refreshToken);

  return { user: toPublicUser(user), tokens };
}

/**
 * Issue new access and refresh tokens using a valid refresh token.
 * Implements token rotation — the old refresh token is revoked.
 *
 * @param refreshToken - The current refresh token.
 * @returns A new pair of access and refresh tokens.
 * @throws {UnauthorizedError} If the refresh token is invalid or revoked.
 */
export function refreshAccessToken(refreshToken: string): AuthTokens {
  const payload = verifyRefreshToken(refreshToken);
  const db = getDatabase();

  // Check if token exists in database
  const result = db.exec(
    'SELECT id FROM refresh_tokens WHERE token = ? AND user_id = ?',
    [refreshToken, payload.userId]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Revoke old refresh token
  db.run('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);

  // Generate new tokens
  const newTokens = generateTokens({ userId: payload.userId, email: payload.email });

  // Store new refresh token
  storeRefreshToken(payload.userId, newTokens.refreshToken);

  return newTokens;
}

/**
 * Persist a refresh token in the database with an expiration timestamp.
 * Also cleans up any expired tokens for the same user.
 *
 * @param userId - The owning user's ID.
 * @param token - The refresh token string to store.
 */
function storeRefreshToken(userId: number, token: string): void {
  const db = getDatabase();
  const config = getConfig();

  const expiryMs = parseExpiryToMs(config.jwt.refreshExpiry);
  const expiresAt = new Date(Date.now() + expiryMs).toISOString();

  db.run(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );

  // Clean up expired tokens for this user
  db.run(
    "DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < datetime('now')",
    [userId]
  );

  saveDatabase();
}

/**
 * Revoke (delete) a refresh token, effectively logging out the session.
 *
 * @param refreshToken - The refresh token to revoke.
 */
export function revokeRefreshToken(refreshToken: string): void {
  const db = getDatabase();
  db.run('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
  saveDatabase();
}

/**
 * Look up a user by their numeric ID.
 *
 * @param userId - The user's database ID.
 * @returns The user's public profile, or `null` if not found.
 */
export function getUserById(userId: number): UserPublic | null {
  const db = getDatabase();

  const result = db.exec(
    'SELECT id, email, username, created_at FROM users WHERE id = ?',
    [userId]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  const row = result[0].values[0];
  return {
    id: row[0] as number,
    email: row[1] as string,
    username: row[2] as string,
    created_at: row[3] as string,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Custom Error Classes
// ────────────────────────────────────────────────────────────────────────────

/** Thrown when a resource creation conflicts with existing data (HTTP 409). */
export class ConflictError extends Error {
  public readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/** Thrown when authentication or authorisation fails (HTTP 401). */
export class UnauthorizedError extends Error {
  public readonly statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
