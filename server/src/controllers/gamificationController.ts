/**
 * @module gamificationController
 * @description Express route handlers for gamification features including
 * achievements and streak tracking.
 */

import type { Request, Response } from 'express';
import { getUserAchievements, getUserStreak } from '../services/gamificationService';
import { requireAuth } from '../helpers/requireAuth';

/**
 * GET /api/gamification/achievements
 *
 * Return the authenticated user's earned and available achievements.
 */
export function getAchievements(req: Request, res: Response): void {
  const userId = requireAuth(req, res);
  if (userId === null) return;

  const achievements = getUserAchievements(userId);

  res.status(200).json({
    success: true,
    data: achievements,
  });
}

/**
 * GET /api/gamification/streak
 *
 * Return the authenticated user's current and longest logging streaks.
 */
export function getStreak(req: Request, res: Response): void {
  const userId = requireAuth(req, res);
  if (userId === null) return;

  const streak = getUserStreak(userId);

  res.status(200).json({
    success: true,
    data: streak,
  });
}
