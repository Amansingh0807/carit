import type { Request, Response } from 'express';
import { getRecommendations } from '../services/recommendationService';

/**
 * GET /api/recommendations
 */
export function list(req: Request, res: Response): void {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const recommendations = getRecommendations(userId);

  res.status(200).json({
    success: true,
    data: recommendations,
  });
}
