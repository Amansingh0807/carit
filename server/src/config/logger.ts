/**
 * @module logger
 * @description Structured logging utility for the Carbon Footprint Platform.
 *
 * Provides leveled log methods (`info`, `warn`, `error`, `debug`) that prefix
 * each message with an ISO-8601 timestamp and a severity tag.  Debug messages
 * are suppressed in production unless `LOG_LEVEL=debug` is set.
 *
 * Usage:
 * ```ts
 * import { logger } from '../config/logger';
 * logger.info('Server started', { port: 3001 });
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Resolve the minimum log level from the environment.
 * Defaults to `debug` in development and `info` in production.
 */
function resolveMinLevel(): number {
  const envLevel = (process.env['LOG_LEVEL'] ?? '').toLowerCase() as LogLevel;
  if (envLevel in LOG_LEVELS) return LOG_LEVELS[envLevel];
  return process.env['NODE_ENV'] === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug;
}

/**
 * Format a log message with timestamp and severity tag.
 */
function formatMessage(level: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Structured logger instance.
 *
 * All methods accept an optional `meta` object that is serialised as JSON
 * and appended to the log line for machine-parseable context.
 */
export const logger = {
  /**
   * Log a debug-level message.  Suppressed in production unless `LOG_LEVEL=debug`.
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (resolveMinLevel() > LOG_LEVELS.debug) return;
    const line = formatMessage('DEBUG', message);
    meta ? console.debug(line, JSON.stringify(meta)) : console.debug(line);
  },

  /**
   * Log an informational message.
   */
  info(message: string, meta?: Record<string, unknown>): void {
    if (resolveMinLevel() > LOG_LEVELS.info) return;
    const line = formatMessage('INFO', message);
    meta ? console.info(line, JSON.stringify(meta)) : console.info(line);
  },

  /**
   * Log a warning message.
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    if (resolveMinLevel() > LOG_LEVELS.warn) return;
    const line = formatMessage('WARN', message);
    meta ? console.warn(line, JSON.stringify(meta)) : console.warn(line);
  },

  /**
   * Log an error message.  Accepts an optional `Error` instance whose stack
   * will be printed in development mode.
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const line = formatMessage('ERROR', message);
    if (meta) {
      console.error(line, JSON.stringify(meta));
    } else {
      console.error(line);
    }
    if (error instanceof Error && process.env['NODE_ENV'] !== 'production') {
      console.error(error.stack);
    }
  },
};
