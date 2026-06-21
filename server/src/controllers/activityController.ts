/**
 * @module activityController
 * @description Express route handlers for carbon activity CRUD operations.
 *
 * Handles creating, reading, updating, and deleting user activity logs,
 * as well as serving emission factor reference data.  All handlers require
 * authentication via the `authenticate` middleware.
 */

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
import { requireAuth } from '../helpers/requireAuth';

/**
 * Safely coerce a query/param value to a string.
 * Handles arrays (takes first element) and objects (returns empty).
 */
function getStringParam(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  if (value && typeof value === 'object') return '';
  return value ? String(value) : '';
}

/**
 * POST /api/activities
 *
 * Create a new carbon activity log entry.  CO2 emissions are auto-calculated
 * from the activity type and value using standard emission factors.
 */
export function create(req: Request, res: Response): void {
  try {
    const userId = requireAuth(req, res);
    if (userId === null) return;

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
 *
 * List activities for the authenticated user with optional filtering
 * by category, date range, and pagination support.
 */
export function list(req: Request, res: Response): void {
  const userId = requireAuth(req, res);
  if (userId === null) return;

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
 *
 * Retrieve a single activity by its ID.  Returns 404 if not found
 * and 403 if the activity belongs to a different user.
 */
export function getById(req: Request, res: Response): void {
  try {
    const userId = requireAuth(req, res);
    if (userId === null) return;

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
 *
 * Update an existing activity.  Supports partial updates — only the fields
 * included in the request body are modified.  CO2 is recalculated automatically.
 */
export function update(req: Request, res: Response): void {
  try {
    const userId = requireAuth(req, res);
    if (userId === null) return;

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
 *
 * Remove an activity log entry.  Only the owning user may delete it.
 */
export function remove(req: Request, res: Response): void {
  try {
    const userId = requireAuth(req, res);
    if (userId === null) return;

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
 *
 * Return the reference list of emission factors, optionally filtered by category.
 */
export function getEmissionFactors(req: Request, res: Response): void {
  const categoryParam = getStringParam(req.query['category']);

  const factors = categoryParam ? getFactorsByCategory(categoryParam) : EMISSION_FACTORS;

  res.status(200).json({
    success: true,
    data: factors,
  });
}
