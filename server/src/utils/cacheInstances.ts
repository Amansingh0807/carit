/**
 * @module cacheInstances
 * @description Centralised cache instances for analytics and recommendation services.
 *
 * Extracted to a shared module to avoid circular dependencies between
 * `activityService` (which invalidates caches) and the services that
 * own them (`analyticsService`, `recommendationService`).
 *
 * @example
 * ```ts
 * import { analyticsCache, recommendationCache } from '../utils/cacheInstances';
 * analyticsCache.set(key, summary);
 * recommendationCache.invalidatePrefix(`recommendations:${userId}`);
 * ```
 */

import { AppCache } from './cache';
import type { AnalyticsSummary, Recommendation } from '../types';

/** In-memory analytics cache — 30s TTL per user query. */
export const analyticsCache = new AppCache<AnalyticsSummary>(30_000);

/** Per-user recommendation cache — 60s TTL, invalidated on new activity. */
export const recommendationCache = new AppCache<Recommendation[]>(60_000);
