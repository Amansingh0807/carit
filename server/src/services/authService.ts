import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase, saveDatabase } from '../database/connection';
import { getConfig } from '../config/env';
import type { User, UserPublic, AuthTokens, TokenPayload } from '../types';

/**
 * Parse a duration string (e.g., '15m', '7d') to seconds
 */
function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 minutes
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return value * (multipliers[unit] ?? 60);
}

/**
 * Hash a password with bcrypt
 */
export function hashPassword(password: string): Promise<string> {
  const config = getConfig();
  return bcrypt.hash(password, config.bcryptRounds);
}

/**
 * Compare a password against a hash
 */
export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access and refresh tokens
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
 * Verify an access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  const config = getConfig();
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const config = getConfig();
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}

/**
 * Strip sensitive fields from a user record
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
 * Register a new user
 */
export async function registerUser(
  email: string,
  username: string,
  password: string
): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const db = getDatabase();

  // Check for existing email
  const existingEmail = db.exec(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existingEmail.length > 0 && existingEmail[0].values.length > 0) {
    throw new ConflictError('Email already registered');
  }

  // Check for existing username
  const existingUsername = db.exec(
    'SELECT id FROM users WHERE username = ?',
    [username]
  );
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

  const row = result[0].values[0];
  const user: User = {
    id: row[0] as number,
    email: row[1] as string,
    username: row[2] as string,
    password_hash: row[3] as string,
    created_at: row[4] as string,
    updated_at: row[5] as string,
  };

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
 * Login a user
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

  const row = result[0].values[0];
  const user: User = {
    id: row[0] as number,
    email: row[1] as string,
    username: row[2] as string,
    password_hash: row[3] as string,
    created_at: row[4] as string,
    updated_at: row[5] as string,
  };

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
 * Refresh access token using a valid refresh token
 */
export function refreshAccessToken(refreshToken: string): AuthTokens {
  // Verify the refresh token
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
 * Store a refresh token in the database
 */
function storeRefreshToken(userId: number, token: string): void {
  const db = getDatabase();
  const config = getConfig();

  // Parse expiry duration (e.g., '7d' -> 7 days)
  const expiryStr = config.jwt.refreshExpiry;
  let expiryMs = 7 * 24 * 60 * 60 * 1000; // default 7 days

  const match = expiryStr.match(/^(\d+)([smhd])$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    expiryMs = value * (multipliers[unit] ?? 86400000);
  }

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
 * Logout: revoke a refresh token
 */
export function revokeRefreshToken(refreshToken: string): void {
  const db = getDatabase();
  db.run('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
  saveDatabase();
}

/**
 * Get user by ID
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

// ===== Custom Error Classes =====

export class ConflictError extends Error {
  public readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  public readonly statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
