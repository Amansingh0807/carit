/**
 * @module recommendationController
 * @description Express route handler for personalised carbon reduction recommendations.
 */

import type { Request, Response } from 'express';
import { getRecommendations } from '../services/recommendationService';
import { requireAuth } from '../helpers/requireAuth';

/**
 * GET /api/recommendations
 *
 * Generate and return personalised carbon reduction recommendations
 * based on the authenticated user's activity patterns and emission history.
 */
export function list(req: Request, res: Response): void {
  const userId = requireAuth(req, res);
  if (userId === null) return;

  const recommendations = getRecommendations(userId);

  res.status(200).json({
    success: true,
    data: recommendations,
  });
}
