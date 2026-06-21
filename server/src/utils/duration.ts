/**
 * @module duration
 * @description Shared utilities for parsing human-readable duration strings
 * (e.g. `'15m'`, `'7d'`, `'3600s'`) into numeric values.
 *
 * Eliminates duplicated regex-based duration parsing that previously existed
 * in both `authService.ts` and `storeRefreshToken`.
 */

/** Supported time-unit suffixes and their multiplier in seconds. */
const UNIT_TO_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/** Regex for matching duration strings like `15m`, `7d`, `3600s`. */
const DURATION_REGEX = /^(\d+)([smhd])$/;

/**
 * Parse a duration string into **seconds**.
 *
 * @param expiry - Duration string (e.g. `'15m'`, `'7d'`).
 * @param fallbackSeconds - Value returned when the string is unparseable (default: 900 = 15 min).
 * @returns Duration in seconds.
 *
 * @example
 * ```ts
 * parseExpiryToSeconds('7d');  // 604800
 * parseExpiryToSeconds('15m'); // 900
 * parseExpiryToSeconds('bad'); // 900 (fallback)
 * ```
 */
export function parseExpiryToSeconds(expiry: string, fallbackSeconds = 900): number {
  const match = expiry.match(DURATION_REGEX);
  if (!match) return fallbackSeconds;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  return value * (UNIT_TO_SECONDS[unit] ?? 60);
}

/**
 * Parse a duration string into **milliseconds**.
 *
 * @param expiry - Duration string (e.g. `'15m'`, `'7d'`).
 * @param fallbackMs - Value returned when the string is unparseable (default: 604800000 = 7 days).
 * @returns Duration in milliseconds.
 *
 * @example
 * ```ts
 * parseExpiryToMs('7d');  // 604800000
 * parseExpiryToMs('15m'); // 900000
 * ```
 */
export function parseExpiryToMs(expiry: string, fallbackMs = 7 * 24 * 60 * 60 * 1000): number {
  const match = expiry.match(DURATION_REGEX);
  if (!match) return fallbackMs;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  return value * (UNIT_TO_SECONDS[unit] ?? 60) * 1000;
}
