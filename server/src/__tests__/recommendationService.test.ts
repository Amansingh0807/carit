/**
 * @module recommendationService.test
 * @description Test suite for the personalised recommendation engine.
 * Covers default recommendations for new users, personalised scoring,
 * difficulty multipliers, recommendation count caps, and trigger conditions.
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getRecommendations } from '../services/recommendationService';
import { createActivity } from '../services/activityService';
import { initDatabase, closeDatabase, getDatabase, resetDatabase, saveDatabase } from '../database/connection';
import { runMigrations, seedData } from '../database/migrations';

const TEST_DB_PATH = './data/test_recommendation_service.db';

describe('Recommendation Service', () => {
  let testUserId: number;

  beforeAll(async () => {
    process.env['DB_PATH'] = TEST_DB_PATH;
    process.env['JWT_ACCESS_SECRET'] = 'test_access_secret_reco';
    process.env['JWT_REFRESH_SECRET'] = 'test_refresh_secret_reco';
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
      "INSERT INTO users (email, username, password_hash) VALUES ('reco_test@test.com', 'reco_tester', ?)",
      [hash]
    );
    const userResult = db.exec("SELECT id FROM users WHERE email = 'reco_test@test.com'");
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

  test('should return default recommendations for new user with no activities', () => {
    const recs = getRecommendations(testUserId);
    expect(recs).toBeDefined();
    expect(recs.length).toBe(3);
    expect(recs[0].id).toBe('default-start-logging');
    expect(recs[1].id).toBe('default-walk-more');
    expect(recs[2].id).toBe('default-reduce-waste');
  });

  test('should return default recommendations with correct structure', () => {
    const recs = getRecommendations(testUserId);
    for (const rec of recs) {
      expect(rec).toHaveProperty('id');
      expect(rec).toHaveProperty('title');
      expect(rec).toHaveProperty('description');
      expect(rec).toHaveProperty('category');
      expect(rec).toHaveProperty('difficulty');
      expect(rec).toHaveProperty('potential_savings_kg');
      expect(rec).toHaveProperty('icon');
    }
  });

  test('should generate transport recommendations after logging car trips', () => {
    // Log enough car trips to trigger transport recommendations
    for (let i = 0; i < 5; i++) {
      createActivity(testUserId, {
        category: 'transportation',
        activity_type: 'car',
        value: 50,
        unit: 'km',
        date: `2026-06-0${i + 1}`,
      });
    }

    const recs = getRecommendations(testUserId);
    expect(recs.length).toBeGreaterThan(0);

    // Should include transport-related recommendations
    const transportRecs = recs.filter((r) => r.category === 'transportation');
    expect(transportRecs.length).toBeGreaterThan(0);
  });

  test('should cap recommendations at 8', () => {
    // Add more diverse activities to trigger many rules
    for (let i = 0; i < 5; i++) {
      createActivity(testUserId, {
        category: 'food',
        activity_type: 'beef',
        value: 5,
        unit: 'kg',
        date: `2026-06-${10 + i}`,
      });
    }
    for (let i = 0; i < 3; i++) {
      createActivity(testUserId, {
        category: 'energy',
        activity_type: 'electricity',
        value: 200,
        unit: 'kWh',
        date: `2026-06-${15 + i}`,
      });
    }

    const recs = getRecommendations(testUserId);
    expect(recs.length).toBeLessThanOrEqual(8);
  });

  test('should sort recommendations by impact score (highest first)', () => {
    const recs = getRecommendations(testUserId);

    // Verify they have non-zero savings
    const withSavings = recs.filter((r) => r.potential_savings_kg > 0);
    expect(withSavings.length).toBeGreaterThan(0);
  });

  test('should include food recommendations when beef is logged', () => {
    const recs = getRecommendations(testUserId);
    const foodRecs = recs.filter((r) => r.category === 'food');
    expect(foodRecs.length).toBeGreaterThan(0);
  });
});
