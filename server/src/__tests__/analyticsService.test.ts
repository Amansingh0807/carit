/**
 * @module analyticsService.test
 * @description Test suite for analytics aggregation service.
 * Covers empty state, total calculations, category breakdowns,
 * daily trends, date range filtering, and precision rounding.
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getAnalyticsSummary } from '../services/analyticsService';
import { createActivity } from '../services/activityService';
import { initDatabase, closeDatabase, getDatabase, resetDatabase, saveDatabase } from '../database/connection';
import { runMigrations, seedData } from '../database/migrations';

const TEST_DB_PATH = './data/test_analytics_service.db';

describe('Analytics Service', () => {
  let testUserId: number;

  beforeAll(async () => {
    process.env['DB_PATH'] = TEST_DB_PATH;
    process.env['JWT_ACCESS_SECRET'] = 'test_access_secret_analytics';
    process.env['JWT_REFRESH_SECRET'] = 'test_refresh_secret_analytics';
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
      "INSERT INTO users (email, username, password_hash) VALUES ('analytics_test@test.com', 'analytics_tester', ?)",
      [hash]
    );
    const userResult = db.exec("SELECT id FROM users WHERE email = 'analytics_test@test.com'");
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

  test('should return zero totals for user with no activities', () => {
    const summary = getAnalyticsSummary(testUserId);
    expect(summary.total_co2_kg).toBe(0);
    expect(summary.activity_count).toBe(0);
    expect(summary.category_breakdown).toHaveLength(0);
    expect(summary.daily_trends).toHaveLength(0);
  });

  test('should calculate correct totals after adding activities', () => {
    // Car: 0.21 * 100 = 21 kg
    createActivity(testUserId, {
      category: 'transportation',
      activity_type: 'car',
      value: 100,
      unit: 'km',
      date: '2026-06-10',
    });

    // Beef: 27.0 * 1 = 27 kg
    createActivity(testUserId, {
      category: 'food',
      activity_type: 'beef',
      value: 1,
      unit: 'kg',
      date: '2026-06-10',
    });

    const summary = getAnalyticsSummary(testUserId);
    expect(summary.total_co2_kg).toBe(48); // 21 + 27
    expect(summary.activity_count).toBe(2);
  });

  test('should provide correct category breakdown', () => {
    const summary = getAnalyticsSummary(testUserId);
    expect(summary.category_breakdown.length).toBeGreaterThanOrEqual(2);

    const transportCat = summary.category_breakdown.find((c) => c.category === 'transportation');
    expect(transportCat).toBeDefined();
    expect(transportCat?.total_co2_kg).toBe(21);
    expect(transportCat?.activity_count).toBe(1);

    const foodCat = summary.category_breakdown.find((c) => c.category === 'food');
    expect(foodCat).toBeDefined();
    expect(foodCat?.total_co2_kg).toBe(27);
  });

  test('should filter by date range', () => {
    // Add an activity on a different date
    createActivity(testUserId, {
      category: 'energy',
      activity_type: 'electricity',
      value: 50,
      unit: 'kWh',
      date: '2026-06-15',
    });

    const filtered = getAnalyticsSummary(testUserId, '2026-06-15', '2026-06-15');
    expect(filtered.activity_count).toBe(1);
    expect(filtered.total_co2_kg).toBe(20); // 0.4 * 50 = 20
  });

  test('should provide daily trends within date range', () => {
    const summary = getAnalyticsSummary(testUserId, '2026-06-10', '2026-06-15');
    expect(summary.daily_trends.length).toBeGreaterThanOrEqual(1);

    const june10 = summary.daily_trends.find((t) => t.date === '2026-06-10');
    expect(june10).toBeDefined();
    expect(june10?.total_co2_kg).toBe(48); // 21 + 27 on same day
  });

  test('should round CO2 values to 3 decimal places', () => {
    // Bus: 0.089 * 7 = 0.623 (tests rounding)
    createActivity(testUserId, {
      category: 'transportation',
      activity_type: 'bus',
      value: 7,
      unit: 'km',
      date: '2026-06-16',
    });

    const summary = getAnalyticsSummary(testUserId, '2026-06-16', '2026-06-16');
    expect(summary.total_co2_kg).toBe(0.623);
  });
});
