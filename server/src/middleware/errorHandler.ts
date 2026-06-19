import type { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
}

/**
 * Global error handling middleware.
 * Catches all unhandled errors and returns consistent JSON responses.
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
    console.error('❌ Internal Error:', err.message);
    if (process.env['NODE_ENV'] === 'development') {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env['NODE_ENV'] === 'development' && statusCode === 500
      ? { stack: err.stack }
      : {}),
  });
}
