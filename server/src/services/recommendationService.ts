/**
 * @module recommendationService
 * @description Rule-based recommendation engine for personalised carbon reduction strategies.
 *
 * Analyses a user's activity patterns (highest-emitting categories and types)
 * and generates ranked, actionable suggestions.  Results are cached per user
 * with a 60-second TTL, invalidated automatically when new activities are logged.
 *
 * Scoring algorithm:
 * 1. Each rule has a `baseSavingsKg` and a trigger condition.
 * 2. Applicable rules are scored: `savingsKg * difficultyMultiplier`.
 * 3. Results are sorted by score (highest impact first) and capped at 8.
 */

import { getDatabase } from '../database/connection';
import { recommendationCache } from '../utils/cacheInstances';
import type { Recommendation, ActivityCategory, DifficultyLevel } from '../types';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** Internal rule definition for the recommendation engine. */
interface RecommendationRule {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  difficulty: DifficultyLevel;
  baseSavingsKg: number;
  icon: string;
  trigger: {
    activityTypes?: string[];
    minCo2Kg?: number;
    minCount?: number;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Rule Definitions
// ────────────────────────────────────────────────────────────────────────────

/**
 * Complete set of recommendation rules organised by category.
 * Each rule defines a trigger condition and a base CO2 savings estimate.
 */
const RECOMMENDATION_RULES: ReadonlyArray<RecommendationRule> = [
  // ===== Transportation =====
  {
    id: 'trans-bike-commute',
    title: 'Switch to cycling for short trips',
    description: 'Replace car trips under 5km with cycling. This eliminates 100% of emissions for those trips and improves your health.',
    category: 'transportation',
    difficulty: 'easy',
    baseSavingsKg: 1.05,
    icon: 'bike',
    trigger: { activityTypes: ['car'], minCount: 3 },
  },
  {
    id: 'trans-public-transit',
    title: 'Use public transit instead of driving',
    description: 'Buses emit 58% less CO2 per km than cars, and trains emit 80% less. Plan your commute around public transit routes.',
    category: 'transportation',
    difficulty: 'easy',
    baseSavingsKg: 2.4,
    icon: 'bus',
    trigger: { activityTypes: ['car'], minCount: 5 },
  },
  {
    id: 'trans-carpool',
    title: 'Start carpooling to work',
    description: 'Sharing rides with 2+ people cuts per-person emissions by 50-75%. Use carpooling apps to find commute partners.',
    category: 'transportation',
    difficulty: 'medium',
    baseSavingsKg: 3.2,
    icon: 'car-share',
    trigger: { activityTypes: ['car'], minCo2Kg: 20 },
  },
  {
    id: 'trans-ev-switch',
    title: 'Consider switching to an electric vehicle',
    description: 'EVs produce 75% less CO2 than petrol cars over their lifetime. Many countries offer purchase incentives.',
    category: 'transportation',
    difficulty: 'hard',
    baseSavingsKg: 15.0,
    icon: 'bolt',
    trigger: { activityTypes: ['car'], minCo2Kg: 50 },
  },
  {
    id: 'trans-reduce-flights',
    title: 'Replace short flights with train travel',
    description: 'A train journey produces up to 80% less CO2 than the equivalent flight. Consider rail for trips under 500km.',
    category: 'transportation',
    difficulty: 'medium',
    baseSavingsKg: 40.0,
    icon: 'train',
    trigger: { activityTypes: ['flight_domestic', 'flight_international'], minCount: 1 },
  },

  // ===== Energy =====
  {
    id: 'energy-led-bulbs',
    title: 'Switch to LED lighting',
    description: 'LED bulbs use 75% less energy than incandescent bulbs and last 25x longer. An easy switch with immediate savings.',
    category: 'energy',
    difficulty: 'easy',
    baseSavingsKg: 5.0,
    icon: 'lightbulb',
    trigger: { activityTypes: ['electricity'], minCo2Kg: 10 },
  },
  {
    id: 'energy-thermostat',
    title: 'Lower your thermostat by 2 degrees C',
    description: 'Reducing heating by just 2 degrees C can cut your heating bill by 10% and significantly reduce natural gas consumption.',
    category: 'energy',
    difficulty: 'easy',
    baseSavingsKg: 8.0,
    icon: 'thermometer',
    trigger: { activityTypes: ['natural_gas', 'heating_oil'], minCount: 1 },
  },
  {
    id: 'energy-solar-panels',
    title: 'Install solar panels',
    description: 'Solar panels can reduce your electricity carbon footprint by 80-100%. Many providers offer financing with no upfront cost.',
    category: 'energy',
    difficulty: 'hard',
    baseSavingsKg: 50.0,
    icon: 'sun',
    trigger: { activityTypes: ['electricity'], minCo2Kg: 30 },
  },
  {
    id: 'energy-smart-power',
    title: 'Use smart power strips',
    description: 'Standby power accounts for 5-10% of residential electricity. Smart strips eliminate phantom loads automatically.',
    category: 'energy',
    difficulty: 'easy',
    baseSavingsKg: 3.0,
    icon: 'plug',
    trigger: { activityTypes: ['electricity'], minCount: 2 },
  },

  // ===== Food =====
  {
    id: 'food-meatless-monday',
    title: 'Start Meatless Mondays',
    description: 'Replacing beef with plant-based meals one day per week can save over 100kg CO2 per year. Start with just one day!',
    category: 'food',
    difficulty: 'easy',
    baseSavingsKg: 2.5,
    icon: 'salad',
    trigger: { activityTypes: ['beef'], minCount: 1 },
  },
  {
    id: 'food-reduce-beef',
    title: 'Reduce beef consumption by 50%',
    description: 'Beef produces 4x more emissions than chicken and 20x more than plant protein. Substituting half your beef meals makes a huge impact.',
    category: 'food',
    difficulty: 'medium',
    baseSavingsKg: 13.5,
    icon: 'leaf',
    trigger: { activityTypes: ['beef'], minCo2Kg: 10 },
  },
  {
    id: 'food-plant-based',
    title: 'Try a fully plant-based diet',
    description: 'A vegan diet produces 50-75% less emissions than a meat-heavy diet. Start with familiar recipes and explore new cuisines.',
    category: 'food',
    difficulty: 'hard',
    baseSavingsKg: 25.0,
    icon: 'sprout',
    trigger: { activityTypes: ['beef', 'pork', 'chicken'], minCo2Kg: 20 },
  },
  {
    id: 'food-local-seasonal',
    title: 'Buy local and seasonal produce',
    description: 'Locally sourced food travels shorter distances, reducing transport emissions. Seasonal produce avoids energy-intensive greenhouse growing.',
    category: 'food',
    difficulty: 'easy',
    baseSavingsKg: 2.0,
    icon: 'store',
    trigger: { activityTypes: ['vegetables', 'fruits'], minCount: 3 },
  },

  // ===== Shopping =====
  {
    id: 'shop-secondhand',
    title: 'Buy secondhand when possible',
    description: 'Secondhand items produce 97% less CO2 than new ones. Thrift stores, online marketplaces, and swap events are great sources.',
    category: 'shopping',
    difficulty: 'easy',
    baseSavingsKg: 14.5,
    icon: 'recycle',
    trigger: { activityTypes: ['clothing', 'electronics', 'furniture'], minCount: 2 },
  },
  {
    id: 'shop-reduce-fast-fashion',
    title: 'Reduce fast fashion purchases',
    description: 'Each clothing item produces ~15kg CO2. Build a capsule wardrobe with quality pieces that last years instead of months.',
    category: 'shopping',
    difficulty: 'medium',
    baseSavingsKg: 12.0,
    icon: 'shirt',
    trigger: { activityTypes: ['clothing'], minCount: 3 },
  },
  {
    id: 'shop-repair-reuse',
    title: 'Repair electronics instead of replacing',
    description: 'Manufacturing a new phone produces ~70kg CO2. Extending device life by 1 year can reduce its carbon footprint by 25%.',
    category: 'shopping',
    difficulty: 'medium',
    baseSavingsKg: 25.0,
    icon: 'wrench',
    trigger: { activityTypes: ['electronics'], minCount: 1 },
  },
  {
    id: 'shop-minimal-packaging',
    title: 'Choose products with minimal packaging',
    description: 'Opt for bulk items, refill stations, and products with recyclable packaging to reduce waste and manufacturing emissions.',
    category: 'shopping',
    difficulty: 'easy',
    baseSavingsKg: 3.0,
    icon: 'package',
    trigger: { activityTypes: ['packaging'], minCount: 5 },
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Scoring Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Difficulty multiplier — easier actions get higher scores to encourage adoption.
 *
 * @param difficulty - The difficulty level of the recommendation.
 * @returns Numeric multiplier for scoring.
 */
function getDifficultyMultiplier(difficulty: DifficultyLevel): number {
  const multipliers: Record<DifficultyLevel, number> = {
    easy: 1.5,
    medium: 1.0,
    hard: 0.7,
  };
  return multipliers[difficulty];
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generate personalised recommendations based on a user's activity patterns.
 *
 * Algorithm:
 * 1. Fetch user's activity summary grouped by type.
 * 2. Evaluate each rule's trigger against the user's data.
 * 3. Score applicable rules by `savingsKg * difficultyMultiplier`.
 * 4. Return the top 8 recommendations sorted by impact score.
 *
 * For new users with no activities, returns a set of general starter tips.
 *
 * @param userId - The user's ID.
 * @returns Array of up to 8 personalised `Recommendation` objects.
 */
export function getRecommendations(userId: number): Recommendation[] {
  // Check cache
  const cacheKey = `recommendations:${userId}`;
  const cached = recommendationCache.get(cacheKey);
  if (cached) return cached;

  const db = getDatabase();

  // Get user's activity summary by type
  const activitySummary = db.exec(
    `SELECT activity_type, category, COUNT(*) as count, SUM(co2_kg) as total_co2
     FROM activities WHERE user_id = ?
     GROUP BY activity_type, category
     ORDER BY total_co2 DESC`,
    [userId]
  );

  if (activitySummary.length === 0 || activitySummary[0].values.length === 0) {
    const defaults = getDefaultRecommendations();
    recommendationCache.set(cacheKey, defaults);
    return defaults;
  }

  // Build lookup maps for O(1) access
  const typeCounts = new Map<string, number>();
  const typeCo2 = new Map<string, number>();

  for (const row of activitySummary[0].values) {
    const activityType = row[0] as string;
    const count = row[2] as number;
    const co2 = row[3] as number;
    typeCounts.set(activityType, count);
    typeCo2.set(activityType, co2);
  }

  // Score and filter applicable recommendations
  const scored: Array<{ rule: RecommendationRule; score: number; savingsKg: number }> = [];

  for (const rule of RECOMMENDATION_RULES) {
    const { trigger } = rule;
    let applicable = false;
    let relevantCo2 = 0;

    if (trigger.activityTypes) {
      for (const type of trigger.activityTypes) {
        const count = typeCounts.get(type) ?? 0;
        const co2 = typeCo2.get(type) ?? 0;

        if (trigger.minCount && count >= trigger.minCount) {
          applicable = true;
          relevantCo2 += co2;
        }
        if (trigger.minCo2Kg && co2 >= trigger.minCo2Kg) {
          applicable = true;
          relevantCo2 += co2;
        }
      }
    }

    if (applicable) {
      const savingsKg = Math.min(rule.baseSavingsKg, relevantCo2 * 0.5);
      const score = savingsKg * getDifficultyMultiplier(rule.difficulty);
      scored.push({ rule, score, savingsKg });
    }
  }

  // Sort by score (highest impact first) and return top recommendations
  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, 8).map(({ rule, savingsKg }) => ({
    id: rule.id,
    title: rule.title,
    description: rule.description,
    category: rule.category,
    difficulty: rule.difficulty,
    potential_savings_kg: Math.round(savingsKg * 100) / 100,
    icon: rule.icon,
  }));

  // Cache results
  recommendationCache.set(cacheKey, results);

  return results;
}

/**
 * Default recommendations for users with no activity history.
 * Provides general eco-friendly tips to encourage first-time logging.
 *
 * @returns Array of 3 general-purpose `Recommendation` objects.
 */
function getDefaultRecommendations(): Recommendation[] {
  return [
    {
      id: 'default-start-logging',
      title: 'Start logging your daily activities',
      description: 'The first step to reducing your carbon footprint is understanding it. Log your transportation, energy use, food, and shopping habits.',
      category: 'transportation',
      difficulty: 'easy',
      potential_savings_kg: 0,
      icon: 'clipboard',
    },
    {
      id: 'default-walk-more',
      title: 'Walk or cycle for trips under 2km',
      description: 'Short car trips are the least fuel-efficient. Walking or cycling eliminates emissions entirely and keeps you healthy.',
      category: 'transportation',
      difficulty: 'easy',
      potential_savings_kg: 1.0,
      icon: 'footprints',
    },
    {
      id: 'default-reduce-waste',
      title: 'Reduce food waste',
      description: 'About 30% of food is wasted globally. Plan meals, use leftovers, and compost scraps to cut your food-related emissions.',
      category: 'food',
      difficulty: 'easy',
      potential_savings_kg: 2.0,
      icon: 'utensils',
    },
  ];
}
