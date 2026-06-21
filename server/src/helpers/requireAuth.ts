/**
 * @module requireAuth
 * @description Shared helper that extracts and validates the authenticated
 * user ID from an Express request.  Sends a 401 JSON response when the
 * request is not authenticated, eliminating 5+ instances of identical
 * guard code across controllers.
 *
 * Usage:
 * ```ts
 * const userId = requireAuth(req, res);
 * if (userId === null) return;   // 401 already sent
 * ```
 */

import type { Request, Response } from 'express';

/**
 * Extract the authenticated user's ID from the request.
 *
 * @param req - Express request (must have `req.user` set by auth middleware).
 * @param res - Express response (used to send 401 if unauthenticated).
 * @returns The numeric user ID, or `null` if authentication failed (response already sent).
 */
export function requireAuth(req: Request, res: Response): number | null {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return null;
  }
  return userId;
}
