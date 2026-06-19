import type { Request, Response } from 'express';
import { getAnalyticsSummary } from '../services/analyticsService';
import type { AnalyticsQuery } from '../validators/schemas';

/**
 * GET /api/analytics/summary
 */
export function getSummary(req: Request, res: Response): void {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const query = req.query as unknown as AnalyticsQuery;
  const summary = getAnalyticsSummary(userId, query.startDate, query.endDate);

  res.status(200).json({
    success: true,
    data: summary,
  });
}
