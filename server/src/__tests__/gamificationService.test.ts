/**
 * @module gamificationService.test
 * @description Test suite for gamification service (achievements and streaks).
 * Covers earned/available achievement retrieval and streak defaults.
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getUserAchievements, getUserStreak } from '../services/gamificationService';
import { createActivity } from '../services/activityService';
import { initDatabase, closeDatabase, getDatabase, resetDatabase, saveDatabase } from '../database/connection';
import { runMigrations, seedData } from '../database/migrations';

const TEST_DB_PATH = './data/test_gamification_service.db';

describe('Gamification Service', () => {
  let testUserId: number;

  beforeAll(async () => {
    process.env['DB_PATH'] = TEST_DB_PATH;
    process.env['JWT_ACCESS_SECRET'] = 'test_access_secret_gamif';
    process.env['JWT_REFRESH_SECRET'] = 'test_refresh_secret_gamif';
    process.env['JWT_ACCESS_EXPIRY'] = '15m';
    process.env['JWT_REFRESH_EXPIRY'] = '7d';
    process.env['BCRYPT_ROUNDS'] = '4';

    const resolvedPath = path.resolve(TEST_DB_PATH);
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }

    resetDatabase();
    await initDatabase();
    const db = getDatabase();
    runMigrations(db);
    await seedData(db, { seedDemoUser: false, bcryptRounds: 4 });

    // Create test user
    const hash = bcrypt.hashSync('TestPass123!', 4);
    db.run(
      "INSERT INTO users (email, username, password_hash) VALUES ('gamif_test@test.com', 'gamif_tester', ?)",
      [hash]
    );
    const userResult = db.exec("SELECT id FROM users WHERE email = 'gamif_test@test.com'");
    testUserId = userResult[0].values[0][0] as number;
    db.run(
      'INSERT INTO user_streaks (user_id, current_streak, longest_streak) VALUES (?, 0, 0)',
      [testUserId]
    );

    saveDatabase();
  });

  afterAll(() => {
    closeDatabase();
    resetDatabase();
    const resolvedPath = path.resolve(TEST_DB_PATH);
    if (fs.existsSync(resolvedPath)) {
      try { fs.unlinkSync(resolvedPath); } catch { /* ignore */ }
    }
  });

  // ────────────────── ACHIEVEMENTS ──────────────────

  test('should return empty earned and all available achievements for new user', () => {
    const result = getUserAchievements(testUserId);
    expect(result.earned).toHaveLength(0);
    expect(result.available.length).toBeGreaterThan(0);
  });

  test('should return available achievements with correct structure', () => {
    const result = getUserAchievements(testUserId);
    for (const achievement of result.available) {
      expect(achievement).toHaveProperty('id');
      expect(achievement).toHaveProperty('name');
      expect(achievement).toHaveProperty('description');
      expect(achievement).toHaveProperty('icon');
      expect(achievement).toHaveProperty('category');
      expect(achievement).toHaveProperty('threshold');
      expect(achievement).toHaveProperty('threshold_type');
    }
  });

  test('should award First Step achievement after first activity', () => {
    createActivity(testUserId, {
      category: 'transportation',
      activity_type: 'car',
      value: 10,
      unit: 'km',
      date: '2026-06-20',
    });

    const result = getUserAchievements(testUserId);
    const firstStep = result.earned.find((e) => e.achievement.name === 'First Step');
    expect(firstStep).toBeDefined();
    expect(firstStep?.achievement.threshold).toBe(1);
  });

  test('should still have remaining available achievements after earning one', () => {
    const result = getUserAchievements(testUserId);
    expect(result.available.length).toBeGreaterThan(0);
    // First Step should not be in available
    const firstStepAvailable = result.available.find((a) => a.name === 'First Step');
    expect(firstStepAvailable).toBeUndefined();
  });

  // ────────────────── STREAKS ──────────────────

  test('should return default streak for user with no recent activity pattern', () => {
    const streak = getUserStreak(testUserId);
    expect(streak).toBeDefined();
    expect(streak.user_id).toBe(testUserId);
    expect(typeof streak.current_streak).toBe('number');
    expect(typeof streak.longest_streak).toBe('number');
  });

  test('should return streak with correct structure', () => {
    const streak = getUserStreak(testUserId);
    expect(streak).toHaveProperty('id');
    expect(streak).toHaveProperty('user_id');
    expect(streak).toHaveProperty('current_streak');
    expect(streak).toHaveProperty('longest_streak');
    expect(streak).toHaveProperty('last_activity_date');
  });

  test('should return zero streak for non-existent user', () => {
    const streak = getUserStreak(99999);
    expect(streak.current_streak).toBe(0);
    expect(streak.longest_streak).toBe(0);
    expect(streak.last_activity_date).toBeNull();
  });
});
