/**
 * @module errorHandler
 * @description Global Express error handling middleware.
 *
 * Catches all unhandled errors from route handlers and returns consistent
 * JSON error responses.  Server errors (5xx) are logged with full details
 * in development mode but sanitised in production to avoid leaking internals.
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/** Extended error interface with optional HTTP status code. */
interface AppError extends Error {
  statusCode?: number;
}

/**
 * Global error handling middleware.
 *
 * Must be registered **after** all route handlers.  Express identifies
 * error-handling middleware by its 4-parameter signature.
 *
 * @param err - The error thrown or passed via `next(err)`.
 * @param _req - Express request (unused).
 * @param res - Express response.
 * @param _next - Express next function (unused but required for signature).
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  // Log server errors
  if (statusCode === 500) {
    logger.error('Internal server error', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env['NODE_ENV'] === 'development' && statusCode === 500
      ? { stack: err.stack }
      : {}),
  });
}
