import { getDatabase, saveDatabase } from '../database/connection';
import { calculateCO2, getEmissionFactor } from '../constants/emissionFactors';
import type { Activity, ActivityCategory } from '../types';
import type { CreateActivityInput, ActivityQuery } from '../validators/schemas';

export class NotFoundError extends Error {
  public readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  public readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}


function rowToActivity(row: (string | number | Uint8Array | null)[]): Activity {
  return {
    id: row[0] as number,
    user_id: row[1] as number,
    category: row[2] as ActivityCategory,
    activity_type: row[3] as string,
    value: row[4] as number,
    unit: row[5] as string,
    co2_kg: row[6] as number,
    description: row[7] as string | null,
    date: row[8] as string,
    created_at: row[9] as string,
  };
}

/**
 * Create a new activity entry with automatic CO2 calculation
 */
export function createActivity(userId: number, input: CreateActivityInput): Activity {
  const db = getDatabase();

  // Calculate CO2 emissions
  const co2Kg = calculateCO2(input.activity_type, input.value);

  // Get the emission factor for the unit
  const factor = getEmissionFactor(input.activity_type);
  const unit = factor ? factor.unit : input.unit;

  db.run(
    `INSERT INTO activities (user_id, category, activity_type, value, unit, co2_kg, description, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, input.category, input.activity_type, input.value, unit, co2Kg, input.description ?? null, input.date]
  );

  // Get the created activity
  const result = db.exec(
    `SELECT id, user_id, category, activity_type, value, unit, co2_kg, description, date, created_at
     FROM activities WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
    [userId]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Failed to create activity');
  }

  // Update streak
  updateStreak(userId, input.date);

  // Check achievements
  checkAndAwardAchievements(userId);

  saveDatabase();

  return rowToActivity(result[0].values[0]);
}

/**
 * Get activities for a user with filtering and pagination
 */
export function getActivities(
  userId: number,
  query: ActivityQuery
): { activities: Activity[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = ['user_id = ?'];
  const params: (string | number)[] = [userId];

  if (query.category) {
    conditions.push('category = ?');
    params.push(query.category);
  }
  if (query.startDate) {
    conditions.push('date >= ?');
    params.push(query.startDate);
  }
  if (query.endDate) {
    conditions.push('date <= ?');
    params.push(query.endDate);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = db.exec(
    `SELECT COUNT(*) FROM activities WHERE ${whereClause}`,
    params
  );
  const total = countResult.length > 0 && countResult[0].values.length > 0
    ? countResult[0].values[0][0] as number
    : 0;

  // Get paginated results
  const offset = (query.page - 1) * query.limit;
  const dataResult = db.exec(
    `SELECT id, user_id, category, activity_type, value, unit, co2_kg, description, date, created_at
     FROM activities WHERE ${whereClause}
     ORDER BY date DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, query.limit, offset]
  );

  const activities: Activity[] = dataResult.length > 0
    ? dataResult[0].values.map(rowToActivity)
    : [];

  return { activities, total };
}

/**
 * Get a single activity by ID
 */
export function getActivityById(activityId: number, userId: number): Activity {
  const db = getDatabase();

  const result = db.exec(
    `SELECT id, user_id, category, activity_type, value, unit, co2_kg, description, date, created_at
     FROM activities WHERE id = ?`,
    [activityId]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  const activity = rowToActivity(result[0].values[0]);

  if (activity.user_id !== userId) {
    throw new ForbiddenError('Access denied');
  }

  return activity;
}

/**
 * Update an existing activity
 */
export function updateActivity(
  activityId: number,
  userId: number,
  input: Partial<CreateActivityInput>
): Activity {
  // Verify ownership
  const existing = getActivityById(activityId, userId);

  const category = input.category ?? existing.category;
  const activityType = input.activity_type ?? existing.activity_type;
  const value = input.value ?? existing.value;
  const date = input.date ?? existing.date;
  const description = input.description !== undefined ? input.description : existing.description;

  // Recalculate CO2
  const co2Kg = calculateCO2(activityType, value);
  const factor = getEmissionFactor(activityType);
  const unit = factor ? factor.unit : (input.unit ?? existing.unit);

  const db = getDatabase();
  db.run(
    `UPDATE activities 
     SET category = ?, activity_type = ?, value = ?, unit = ?, co2_kg = ?, description = ?, date = ?
     WHERE id = ? AND user_id = ?`,
    [category, activityType, value, unit, co2Kg, description ?? null, date, activityId, userId]
  );

  saveDatabase();

  return getActivityById(activityId, userId);
}

/**
 * Delete an activity
 */
export function deleteActivity(activityId: number, userId: number): void {
  // Verify ownership
  getActivityById(activityId, userId);

  const db = getDatabase();
  db.run('DELETE FROM activities WHERE id = ? AND user_id = ?', [activityId, userId]);
  saveDatabase();
}

/**
 * Update user streak based on activity date
 */
function updateStreak(userId: number, activityDate: string): void {
  const db = getDatabase();

  const streakResult = db.exec(
    'SELECT current_streak, longest_streak, last_activity_date FROM user_streaks WHERE user_id = ?',
    [userId]
  );

  if (streakResult.length === 0 || streakResult[0].values.length === 0) {
    // Create streak record if it doesn't exist
    db.run(
      'INSERT OR IGNORE INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date) VALUES (?, 1, 1, ?)',
      [userId, activityDate]
    );
    return;
  }

  const row = streakResult[0].values[0];
  let currentStreak = row[0] as number;
  let longestStreak = row[1] as number;
  const lastDate = row[2] as string | null;

  if (!lastDate) {
    // First activity
    db.run(
      'UPDATE user_streaks SET current_streak = 1, longest_streak = 1, last_activity_date = ? WHERE user_id = ?',
      [activityDate, userId]
    );
    return;
  }

  const last = new Date(lastDate);
  const current = new Date(activityDate);
  const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Consecutive day — extend streak
    currentStreak += 1;
    longestStreak = Math.max(longestStreak, currentStreak);
  } else if (diffDays === 0) {
    // Same day — no change
    return;
  } else {
    // Gap — reset streak
    currentStreak = 1;
  }

  db.run(
    'UPDATE user_streaks SET current_streak = ?, longest_streak = ?, last_activity_date = ? WHERE user_id = ?',
    [currentStreak, longestStreak, activityDate, userId]
  );
}

/**
 * Check and award achievements for a user
 */
function checkAndAwardAchievements(userId: number): void {
  const db = getDatabase();

  // Get all unearned achievements
  const achievementsResult = db.exec(
    `SELECT a.id, a.name, a.category, a.threshold, a.threshold_type
     FROM achievements a
     WHERE a.id NOT IN (
       SELECT achievement_id FROM user_achievements WHERE user_id = ?
     )`,
    [userId]
  );

  if (achievementsResult.length === 0 || achievementsResult[0].values.length === 0) return;

  // Get user stats
  const totalCountResult = db.exec(
    'SELECT COUNT(*) FROM activities WHERE user_id = ?',
    [userId]
  );
  const totalCount = totalCountResult.length > 0 && totalCountResult[0].values.length > 0
    ? totalCountResult[0].values[0][0] as number
    : 0;

  const categoryCounts = new Map<string, number>();
  const catCountResult = db.exec(
    'SELECT category, COUNT(*) FROM activities WHERE user_id = ? GROUP BY category',
    [userId]
  );
  if (catCountResult.length > 0) {
    for (const row of catCountResult[0].values) {
      categoryCounts.set(row[0] as string, row[1] as number);
    }
  }

  // Get streak
  const streakResult = db.exec(
    'SELECT current_streak FROM user_streaks WHERE user_id = ?',
    [userId]
  );
  const currentStreak = streakResult.length > 0 && streakResult[0].values.length > 0
    ? streakResult[0].values[0][0] as number
    : 0;

  // Check each unearned achievement
  for (const row of achievementsResult[0].values) {
    const achievementId = row[0] as number;
    const category = row[2] as string;
    const threshold = row[3] as number;
    const thresholdType = row[4] as string;

    let earned = false;

    if (thresholdType === 'count') {
      if (category === 'general') {
        earned = totalCount >= threshold;
      } else {
        const catCount = categoryCounts.get(category) ?? 0;
        earned = catCount >= threshold;
      }
    } else if (thresholdType === 'streak') {
      earned = currentStreak >= threshold;
    }

    if (earned) {
      db.run(
        'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
        [userId, achievementId]
      );
    }
  }
}
