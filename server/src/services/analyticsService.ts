/**
 * @module analyticsService
 * @description Aggregated carbon emission analytics for user dashboards.
 *
 * Provides summary statistics including total CO2, category breakdowns,
 * and daily trend data.  Results are cached for 30 seconds to reduce
 * redundant database queries on repeated dashboard loads.
 */

import { getDatabase } from '../database/connection';
import { analyticsCache } from '../utils/cacheInstances';
import type { AnalyticsSummary, CategoryBreakdown, DailyTrend, ActivityCategory } from '../types';

/**
 * Generate a cache key for analytics queries.
 */
function cacheKey(userId: number, startDate?: string, endDate?: string): string {
  return `analytics:${userId}:${startDate ?? 'all'}:${endDate ?? 'all'}`;
}

/**
 * Get comprehensive analytics summary for a user's carbon emissions.
 *
 * Returns:
 * - `total_co2_kg` — sum of all CO2 emissions in the date range
 * - `activity_count` — number of activities logged
 * - `category_breakdown` — per-category totals and counts
 * - `daily_trends` — day-by-day emission totals
 *
 * @param userId - The user's ID.
 * @param startDate - Optional start date filter (YYYY-MM-DD).
 * @param endDate - Optional end date filter (YYYY-MM-DD).
 * @returns Aggregated analytics summary.
 */
export function getAnalyticsSummary(
  userId: number,
  startDate?: string,
  endDate?: string
): AnalyticsSummary {
  // Check cache first
  const key = cacheKey(userId, startDate, endDate);
  const cached = analyticsCache.get(key);
  if (cached) return cached;

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

  const summary: AnalyticsSummary = {
    total_co2_kg: Math.round(totalCo2 * 1000) / 1000,
    category_breakdown: categoryBreakdown,
    daily_trends: dailyTrends,
    activity_count: activityCount,
  };

  // Cache the result
  analyticsCache.set(key, summary);

  return summary;
}
