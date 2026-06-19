import { getDatabase } from '../database/connection';
import type { AnalyticsSummary, CategoryBreakdown, DailyTrend, ActivityCategory } from '../types';

/**
 * Get comprehensive analytics summary for a user
 */
export function getAnalyticsSummary(
  userId: number,
  startDate?: string,
  endDate?: string
): AnalyticsSummary {
  const db = getDatabase();

  const dateConditions: string[] = [];
  const dateParams: (string | number)[] = [userId];

  if (startDate) {
    dateConditions.push('date >= ?');
    dateParams.push(startDate);
  }
  if (endDate) {
    dateConditions.push('date <= ?');
    dateParams.push(endDate);
  }

  const dateClause = dateConditions.length > 0
    ? ' AND ' + dateConditions.join(' AND ')
    : '';

  // Total emissions and count
  const totalResult = db.exec(
    `SELECT COALESCE(SUM(co2_kg), 0), COUNT(*) 
     FROM activities WHERE user_id = ?${dateClause}`,
    dateParams
  );

  const totalCo2 = totalResult.length > 0 && totalResult[0].values.length > 0
    ? totalResult[0].values[0][0] as number
    : 0;
  const activityCount = totalResult.length > 0 && totalResult[0].values.length > 0
    ? totalResult[0].values[0][1] as number
    : 0;

  // Category breakdown
  const categoryResult = db.exec(
    `SELECT category, COALESCE(SUM(co2_kg), 0), COUNT(*)
     FROM activities WHERE user_id = ?${dateClause}
     GROUP BY category
     ORDER BY SUM(co2_kg) DESC`,
    dateParams
  );

  const categoryBreakdown: CategoryBreakdown[] = categoryResult.length > 0
    ? categoryResult[0].values.map((row) => ({
        category: row[0] as ActivityCategory,
        total_co2_kg: Math.round((row[1] as number) * 1000) / 1000,
        activity_count: row[2] as number,
      }))
    : [];

  // Daily trends (last 30 days by default)
  const trendParams: (string | number)[] = [userId];
  let trendDateClause = '';

  if (startDate && endDate) {
    trendDateClause = ' AND date >= ? AND date <= ?';
    trendParams.push(startDate, endDate);
  } else {
    trendDateClause = " AND date >= date('now', '-30 days')";
  }

  const trendResult = db.exec(
    `SELECT date, COALESCE(SUM(co2_kg), 0)
     FROM activities WHERE user_id = ?${trendDateClause}
     GROUP BY date
     ORDER BY date ASC`,
    trendParams
  );

  const dailyTrends: DailyTrend[] = trendResult.length > 0
    ? trendResult[0].values.map((row) => ({
        date: row[0] as string,
        total_co2_kg: Math.round((row[1] as number) * 1000) / 1000,
      }))
    : [];

  return {
    total_co2_kg: Math.round(totalCo2 * 1000) / 1000,
    category_breakdown: categoryBreakdown,
    daily_trends: dailyTrends,
    activity_count: activityCount,
  };
}
