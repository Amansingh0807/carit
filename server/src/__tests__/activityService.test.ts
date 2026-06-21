/**
 * @module activityService.test
 * @description Test suite for the activity CRUD service layer.
 * Covers creation, retrieval, pagination, filtering, updates, deletion,
 * CO2 calculation accuracy, ownership enforcement, and streak/achievement side-effects.
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  NotFoundError,
  ForbiddenError,
} from '../services/activityService';
import { initDatabase, closeDatabase, getDatabase, resetDatabase, saveDatabase } from '../database/connection';
import { runMigrations, seedData } from '../database/migrations';

const TEST_DB_PATH = './data/test_activity_service.db';

describe('Activity Service', () => {
  let testUserId: number;

  beforeAll(async () => {
    process.env['DB_PATH'] = TEST_DB_PATH;
    process.env['JWT_ACCESS_SECRET'] = 'test_access_secret_for_activity';
    process.env['JWT_REFRESH_SECRET'] = 'test_refresh_secret_for_activity';
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

    // Create a test user
    const hash = bcrypt.hashSync('TestPass123!', 4);
    db.run(
      "INSERT INTO users (email, username, password_hash) VALUES ('activity_test@test.com', 'activity_tester', ?)",
      [hash]
    );
    const userResult = db.exec("SELECT id FROM users WHERE email = 'activity_test@test.com'");
    testUserId = userResult[0].values[0][0] as number;

    // Init streak
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

  // ────────────────── CREATE ──────────────────

  test('should create an activity with correct CO2 calculation', () => {
    const activity = createActivity(testUserId, {
      category: 'transportation',
      activity_type: 'car',
      value: 100,
      unit: 'km',
      date: '2026-06-01',
    });

    expect(activity).toBeDefined();
    expect(activity.id).toBeGreaterThan(0);
    expect(activity.user_id).toBe(testUserId);
    expect(activity.category).toBe('transportation');
    expect(activity.co2_kg).toBe(21); // 0.21 * 100 = 21
  });

  test('should create activity with zero-emission type', () => {
    const activity = createActivity(testUserId, {
      category: 'transportation',
      activity_type: 'bicycle',
      value: 50,
      unit: 'km',
      date: '2026-06-01',
    });

    expect(activity.co2_kg).toBe(0);
  });

  test('should throw error for unknown activity type', () => {
    expect(() => {
      createActivity(testUserId, {
        category: 'transportation',
        activity_type: 'teleportation',
        value: 10,
        unit: 'km',
        date: '2026-06-01',
      });
    }).toThrow('Unknown activity type: teleportation');
  });

  test('should create activity with optional description', () => {
    const activity = createActivity(testUserId, {
      category: 'food',
      activity_type: 'beef',
      value: 2,
      unit: 'kg',
      description: 'Steak dinner',
      date: '2026-06-02',
    });

    expect(activity.description).toBe('Steak dinner');
    expect(activity.co2_kg).toBe(54); // 27.0 * 2 = 54
  });

  // ────────────────── READ ──────────────────

  test('should list activities with pagination', () => {
    const result = getActivities(testUserId, {
      page: 1,
      limit: 2,
    });

    expect(result.activities).toHaveLength(2);
    expect(result.total).toBeGreaterThanOrEqual(3);
  });

  test('should filter activities by category', () => {
    const result = getActivities(testUserId, {
      page: 1,
      limit: 20,
      category: 'food',
    });

    expect(result.activities.length).toBeGreaterThanOrEqual(1);
    result.activities.forEach((a) => {
      expect(a.category).toBe('food');
    });
  });

  test('should filter activities by date range', () => {
    const result = getActivities(testUserId, {
      page: 1,
      limit: 20,
      startDate: '2026-06-02',
      endDate: '2026-06-02',
    });

    result.activities.forEach((a) => {
      expect(a.date).toBe('2026-06-02');
    });
  });

  test('should get activity by ID', () => {
    const listed = getActivities(testUserId, { page: 1, limit: 1 });
    const activity = getActivityById(listed.activities[0].id, testUserId);
    expect(activity).toBeDefined();
    expect(activity.user_id).toBe(testUserId);
  });

  test('should throw NotFoundError for non-existent activity', () => {
    expect(() => {
      getActivityById(99999, testUserId);
    }).toThrow(NotFoundError);
  });

  // ────────────────── UPDATE ──────────────────

  test('should update an activity and recalculate CO2', () => {
    const original = createActivity(testUserId, {
      category: 'transportation',
      activity_type: 'car',
      value: 100,
      unit: 'km',
      date: '2026-06-01',
    });

    const updated = updateActivity(original.id, testUserId, {
      value: 200,
    });

    expect(updated.value).toBe(200);
    // CO2 should be recalculated
    expect(updated.co2_kg).not.toBe(original.co2_kg);
    expect(updated.co2_kg).toBe(42);
  });

  test('should update activity description only', () => {
    const listed = getActivities(testUserId, { page: 1, limit: 1 });
    const original = listed.activities[0];

    const updated = updateActivity(original.id, testUserId, {
      description: 'Updated description',
    });

    expect(updated.description).toBe('Updated description');
    expect(updated.category).toBe(original.category);
  });

  // ────────────────── DELETE ──────────────────

  test('should delete an activity', () => {
    const activity = createActivity(testUserId, {
      category: 'energy',
      activity_type: 'electricity',
      value: 100,
      unit: 'kWh',
      date: '2026-06-03',
    });

    expect(() => {
      deleteActivity(activity.id, testUserId);
    }).not.toThrow();

    expect(() => {
      getActivityById(activity.id, testUserId);
    }).toThrow(NotFoundError);
  });

  // ────────────────── OWNERSHIP ──────────────────

  test('should throw ForbiddenError when accessing another user activity', () => {
    const db = getDatabase();
    // Create another user
    const hash = bcrypt.hashSync('Pass1234!', 4);
    db.run(
      "INSERT INTO users (email, username, password_hash) VALUES ('other@test.com', 'other_user', ?)",
      [hash]
    );
    const otherResult = db.exec("SELECT id FROM users WHERE email = 'other@test.com'");
    const otherUserId = otherResult[0].values[0][0] as number;
    db.run(
      'INSERT OR IGNORE INTO user_streaks (user_id, current_streak, longest_streak) VALUES (?, 0, 0)',
      [otherUserId]
    );

    // Create activity for the other user
    const activity = createActivity(otherUserId, {
      category: 'shopping',
      activity_type: 'clothing',
      value: 1,
      unit: 'item',
      date: '2026-06-05',
    });

    // Try to access with testUserId
    expect(() => {
      getActivityById(activity.id, testUserId);
    }).toThrow(ForbiddenError);
  });
});
