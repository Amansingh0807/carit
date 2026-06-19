import type { EmissionFactor } from '../types';

/**
 * Standard emission factors for CO2 equivalent calculations.
 * Sources: EPA, DEFRA, IPCC guidelines
 * Factor units: kg CO2 per unit specified
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
  { activity_type: 'natural_gas', category: 'energy', factor: 2.0, unit: 'm³', label: 'Natural Gas' },
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

/**
 * Get emission factor for a specific activity type
 */
export function getEmissionFactor(activityType: string): EmissionFactor | undefined {
  return EMISSION_FACTORS.find((ef) => ef.activity_type === activityType);
}

/**
 * Calculate CO2 emissions for a given activity
 */
export function calculateCO2(activityType: string, value: number): number {
  const factor = getEmissionFactor(activityType);
  if (!factor) {
    throw new Error(`Unknown activity type: ${activityType}`);
  }
  return Math.round(factor.factor * value * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Get all emission factors for a specific category
 */
export function getFactorsByCategory(category: string): EmissionFactor[] {
  return EMISSION_FACTORS.filter((ef) => ef.category === category);
}
