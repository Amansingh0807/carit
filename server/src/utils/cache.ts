/**
 * @module cache
 * @description Lightweight in-memory TTL cache for reducing redundant database
 * queries on frequently-accessed, seldom-changing data such as analytics
 * summaries and recommendation results.
 *
 * The cache is a simple `Map` with per-entry expiration timestamps.
 * It is **not** distributed — suitable for single-process deployments only.
 *
 * @example
 * ```ts
 * import { AppCache } from '../utils/cache';
 *
 * const analyticsCache = new AppCache<AnalyticsSummary>(30_000); // 30s TTL
 * analyticsCache.set(`user:${userId}`, summary);
 * const cached = analyticsCache.get(`user:${userId}`);
 * ```
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Generic in-memory cache with configurable TTL.
 *
 * @typeParam T - The type of cached values.
 */
export class AppCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;

  /**
   * @param defaultTtlMs - Default time-to-live in milliseconds for new entries.
   */
  constructor(defaultTtlMs: number) {
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Store a value under the given key.
   *
   * @param key - Cache key.
   * @param value - Value to store.
   * @param ttlMs - Optional per-entry TTL override.
   */
  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Retrieve a cached value.  Returns `undefined` if the key is missing
   * or the entry has expired (expired entries are lazily evicted).
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Check if a non-expired entry exists for the given key.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Remove a specific key from the cache.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Remove all keys that start with the given prefix.
   * Useful for invalidating all user-specific cache entries.
   *
   * @param prefix - Key prefix to match (e.g. `'analytics:user:5'`).
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Remove all entries from the cache.
   */
  clear(): void {
    this.store.clear();
  }

  /** Current number of entries (including possibly expired). */
  get size(): number {
    return this.store.size;
  }
}
