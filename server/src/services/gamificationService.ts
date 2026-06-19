import { getDatabase } from '../database/connection';
import type { Achievement, UserAchievement, UserStreak } from '../types';

/**
 * Get all achievements with user's earned status
 */
export function getUserAchievements(userId: number): {
  earned: UserAchievement[];
  available: Achievement[];
} {
  const db = getDatabase();

  // Get earned achievements
  const earnedResult = db.exec(
    `SELECT ua.id, ua.user_id, ua.achievement_id, ua.earned_at,
            a.id as a_id, a.name, a.description, a.icon, a.category, a.threshold, a.threshold_type
     FROM user_achievements ua
     JOIN achievements a ON ua.achievement_id = a.id
     WHERE ua.user_id = ?
     ORDER BY ua.earned_at DESC`,
    [userId]
  );

  const earned: UserAchievement[] = earnedResult.length > 0
    ? earnedResult[0].values.map((row) => ({
        id: row[0] as number,
        user_id: row[1] as number,
        achievement_id: row[2] as number,
        earned_at: row[3] as string,
        achievement: {
          id: row[4] as number,
          name: row[5] as string,
          description: row[6] as string,
          icon: row[7] as string,
          category: row[8] as string,
          threshold: row[9] as number,
          threshold_type: row[10] as 'count' | 'streak' | 'reduction',
        },
      }))
    : [];

  // Get available (unearned) achievements
  const availableResult = db.exec(
    `SELECT id, name, description, icon, category, threshold, threshold_type
     FROM achievements
     WHERE id NOT IN (
       SELECT achievement_id FROM user_achievements WHERE user_id = ?
     )
     ORDER BY threshold ASC`,
    [userId]
  );

  const available: Achievement[] = availableResult.length > 0
    ? availableResult[0].values.map((row) => ({
        id: row[0] as number,
        name: row[1] as string,
        description: row[2] as string,
        icon: row[3] as string,
        category: row[4] as string,
        threshold: row[5] as number,
        threshold_type: row[6] as 'count' | 'streak' | 'reduction',
      }))
    : [];

  return { earned, available };
}

/**
 * Get user's streak information
 */
export function getUserStreak(userId: number): UserStreak {
  const db = getDatabase();

  const result = db.exec(
    'SELECT id, user_id, current_streak, longest_streak, last_activity_date FROM user_streaks WHERE user_id = ?',
    [userId]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return {
      id: 0,
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
    };
  }

  const row = result[0].values[0];
  return {
    id: row[0] as number,
    user_id: row[1] as number,
    current_streak: row[2] as number,
    longest_streak: row[3] as number,
    last_activity_date: row[4] as string | null,
  };
}
