import type { Request, Response } from 'express';
import {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  NotFoundError,
  ForbiddenError,
} from '../services/activityService';
import type { CreateActivityInput, UpdateActivityInput, ActivityQuery } from '../validators/schemas';
import { EMISSION_FACTORS, getFactorsByCategory } from '../constants/emissionFactors';

function getStringParam(value: any): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  if (value && typeof value === 'object') return '';
  return value ? String(value) : '';
}

/**
 * POST /api/activities
 */
export function create(req: Request, res: Response): void {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const input = req.body as CreateActivityInput;
    const activity = createActivity(userId, input);

    res.status(201).json({
      success: true,
      data: { activity },
      message: 'Activity logged successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unknown activity type')) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    throw error;
  }
}

/**
 * GET /api/activities
 */
export function list(req: Request, res: Response): void {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const query = req.query as unknown as ActivityQuery;
  const { activities, total } = getActivities(userId, query);

  res.status(200).json({
    success: true,
    data: activities,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
}

/**
 * GET /api/activities/:id
 */
export function getById(req: Request, res: Response): void {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const activityId = parseInt(getStringParam(req.params['id']), 10);
    if (isNaN(activityId)) {
      res.status(400).json({ success: false, message: 'Invalid activity ID' });
      return;
    }

    const activity = getActivityById(activityId, userId);

    res.status(200).json({
      success: true,
      data: { activity },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof ForbiddenError) {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    throw error;
  }
}

/**
 * PUT /api/activities/:id
 */
export function update(req: Request, res: Response): void {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const activityId = parseInt(getStringParam(req.params['id']), 10);
    if (isNaN(activityId)) {
      res.status(400).json({ success: false, message: 'Invalid activity ID' });
      return;
    }

    const input = req.body as UpdateActivityInput;
    const activity = updateActivity(activityId, userId, input);

    res.status(200).json({
      success: true,
      data: { activity },
      message: 'Activity updated successfully',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof ForbiddenError) {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof Error && error.message.startsWith('Unknown activity type')) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    throw error;
  }
}

/**
 * DELETE /api/activities/:id
 */
export function remove(req: Request, res: Response): void {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const activityId = parseInt(getStringParam(req.params['id']), 10);
    if (isNaN(activityId)) {
      res.status(400).json({ success: false, message: 'Invalid activity ID' });
      return;
    }

    deleteActivity(activityId, userId);

    res.status(200).json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof ForbiddenError) {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    throw error;
  }
}

/**
 * GET /api/activities/emission-factors
 */
export function getEmissionFactors(req: Request, res: Response): void {
  const categoryParam = getStringParam(req.query['category']);

  const factors = categoryParam ? getFactorsByCategory(categoryParam) : EMISSION_FACTORS;

  res.status(200).json({
    success: true,
    data: factors,
  });
}
