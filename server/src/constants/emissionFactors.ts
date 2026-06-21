/**
 * @module emissionFactors
 * @description Standard CO2 emission factors for carbon footprint calculations.
 *
 * Data sourced from EPA, DEFRA, and IPCC guidelines.  Factor units represent
 * kilograms of CO2-equivalent per unit of activity consumed.
 *
 * **Performance**: A `Map<string, EmissionFactor>` is built at module load time
 * for O(1) lookups by activity type, replacing the previous O(n) `Array.find()`.
 */

import type { EmissionFactor } from '../types';

/**
 * Complete list of emission factors across all activity categories.
 * Each entry maps an `activity_type` key to its category, factor, unit, and label.
 */
export const EMISSION_FACTORS: EmissionFactor[] = [
  // ===== Transportation =====
  { activity_type: 'car', category: 'transportation', factor: 0.21, unit: 'km', label: 'Car (petrol/diesel)' },
  { activity_type: 'electric_car', category: 'transportation', factor: 0.05, unit: 'km', label: 'Electric Car' },
  { activity_type: 'bus', category: 'transportation', factor: 0.089, unit: 'km', label: 'Bus' },
  { activity_type: 'train', category: 'transportation', factor: 0.041, unit: 'km', label: 'Train' },
  { activity_type: 'bicycle', category: 'transportation', factor: 0.0, unit: 'km', label: 'Bicycle' },
  { activity_type: 'walking', category: 'transportation', factor: 0.0, unit: 'km', label: 'Walking' },
  { activity_type: 'flight_domestic', category: 'transportation', factor: 0.255, unit: 'km', label: 'Domestic Flight' },
  { activity_type: 'flight_international', category: 'transportation', factor: 0.195, unit: 'km', label: 'International Flight' },
  { activity_type: 'motorcycle', category: 'transportation', factor: 0.103, unit: 'km', label: 'Motorcycle' },

  // ===== Energy =====
  { activity_type: 'electricity', category: 'energy', factor: 0.4, unit: 'kWh', label: 'Grid Electricity' },
  { activity_type: 'natural_gas', category: 'energy', factor: 2.0, unit: 'm\u00B3', label: 'Natural Gas' },
  { activity_type: 'heating_oil', category: 'energy', factor: 2.54, unit: 'litre', label: 'Heating Oil' },
  { activity_type: 'solar', category: 'energy', factor: 0.0, unit: 'kWh', label: 'Solar Energy' },
  { activity_type: 'wind', category: 'energy', factor: 0.0, unit: 'kWh', label: 'Wind Energy' },

  // ===== Food =====
  { activity_type: 'beef', category: 'food', factor: 27.0, unit: 'kg', label: 'Beef' },
  { activity_type: 'pork', category: 'food', factor: 12.1, unit: 'kg', label: 'Pork' },
  { activity_type: 'chicken', category: 'food', factor: 6.9, unit: 'kg', label: 'Chicken' },
  { activity_type: 'fish', category: 'food', factor: 6.1, unit: 'kg', label: 'Fish' },
  { activity_type: 'dairy', category: 'food', factor: 3.2, unit: 'kg', label: 'Dairy Products' },
  { activity_type: 'vegetables', category: 'food', factor: 2.0, unit: 'kg', label: 'Vegetables' },
  { activity_type: 'fruits', category: 'food', factor: 1.1, unit: 'kg', label: 'Fruits' },
  { activity_type: 'grains', category: 'food', factor: 1.4, unit: 'kg', label: 'Grains & Cereals' },
  { activity_type: 'plant_based', category: 'food', factor: 0.9, unit: 'kg', label: 'Plant-Based Protein' },

  // ===== Shopping =====
  { activity_type: 'clothing', category: 'shopping', factor: 15.0, unit: 'item', label: 'Clothing Item' },
  { activity_type: 'electronics', category: 'shopping', factor: 50.0, unit: 'item', label: 'Electronics' },
  { activity_type: 'furniture', category: 'shopping', factor: 75.0, unit: 'item', label: 'Furniture' },
  { activity_type: 'packaging', category: 'shopping', factor: 0.05, unit: 'item', label: 'Packaged Product' },
  { activity_type: 'secondhand', category: 'shopping', factor: 0.5, unit: 'item', label: 'Second-hand Item' },
];

// ────────────────────────────────────────────────────────────────────────────
// O(1) Lookup Map — built once at module load
// ────────────────────────────────────────────────────────────────────────────

/** Pre-built lookup map for O(1) factor retrieval by activity type. */
const FACTOR_MAP: Map<string, EmissionFactor> = new Map(
  EMISSION_FACTORS.map((ef) => [ef.activity_type, ef])
);

/** Pre-built category index for O(1) filtered retrieval. */
const CATEGORY_MAP: Map<string, EmissionFactor[]> = new Map();
for (const ef of EMISSION_FACTORS) {
  const existing = CATEGORY_MAP.get(ef.category) ?? [];
  existing.push(ef);
  CATEGORY_MAP.set(ef.category, existing);
}

/**
 * Get the emission factor for a specific activity type.
 *
 * @param activityType - The activity type key (e.g. `'car'`, `'beef'`).
 * @returns The matching `EmissionFactor`, or `undefined` if not found.
 *
 * **Complexity**: O(1) via pre-built Map lookup.
 */
export function getEmissionFactor(activityType: string): EmissionFactor | undefined {
  return FACTOR_MAP.get(activityType);
}

/**
 * Calculate CO2 emissions for a given activity type and consumption value.
 *
 * @param activityType - The activity type key.
 * @param value - The consumption value (e.g. km driven, kWh used).
 * @returns CO2 emissions in kg, rounded to 3 decimal places.
 * @throws {Error} If the activity type is unknown.
 */
export function calculateCO2(activityType: string, value: number): number {
  const factor = FACTOR_MAP.get(activityType);
  if (!factor) {
    throw new Error(`Unknown activity type: ${activityType}`);
  }
  return Math.round(factor.factor * value * 1000) / 1000;
}

/**
 * Get all emission factors for a specific category.
 *
 * @param category - The category string (e.g. `'transportation'`, `'energy'`).
 * @returns Array of matching `EmissionFactor` entries.
 *
 * **Complexity**: O(1) via pre-built category Map.
 */
export function getFactorsByCategory(category: string): EmissionFactor[] {
  return CATEGORY_MAP.get(category) ?? [];
}
