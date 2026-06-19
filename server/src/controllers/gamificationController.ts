import type { Request, Response } from 'express';
import { getUserAchievements, getUserStreak } from '../services/gamificationService';

/**
 * GET /api/gamification/achievements
 */
export function getAchievements(req: Request, res: Response): void {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const achievements = getUserAchievements(userId);

  res.status(200).json({
    success: true,
    data: achievements,
  });
}

/**
 * GET /api/gamification/streak
 */
export function getStreak(req: Request, res: Response): void {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const streak = getUserStreak(userId);

  res.status(200).json({
    success: true,
    data: streak,
  });
}
