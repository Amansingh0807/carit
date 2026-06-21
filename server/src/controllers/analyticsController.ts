/**
 * @module analyticsController
 * @description Express route handler for carbon analytics summary endpoints.
 */

import type { Request, Response } from 'express';
import { getAnalyticsSummary } from '../services/analyticsService';
import type { AnalyticsQuery } from '../validators/schemas';
import { requireAuth } from '../helpers/requireAuth';

/**
 * GET /api/analytics/summary
 *
 * Return aggregated carbon emission analytics for the authenticated user,
 * including total CO2, category breakdown, and daily trends.
 * Supports optional `startDate` and `endDate` query params.
 */
export function getSummary(req: Request, res: Response): void {
  const userId = requireAuth(req, res);
  if (userId === null) return;

  const query = req.query as unknown as AnalyticsQuery;
  const summary = getAnalyticsSummary(userId, query.startDate, query.endDate);

  res.status(200).json({
    success: true,
    data: summary,
  });
}
