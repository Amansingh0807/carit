import { calculateCO2, getEmissionFactor, getFactorsByCategory } from '../constants/emissionFactors';

describe('Carbon Footprint Calculator Utility', () => {
  test('should return correct emission factor info', () => {
    const factor = getEmissionFactor('car');
    expect(factor).toBeDefined();
    expect(factor?.category).toBe('transportation');
    expect(factor?.factor).toBe(0.21);
    expect(factor?.unit).toBe('km');
  });

  test('should return undefined for unknown activity type', () => {
    const factor = getEmissionFactor('warp_drive');
    expect(factor).toBeUndefined();
  });

  test('should calculate CO2 correctly for transport', () => {
    // Car factor is 0.21 kg CO2/km. 100km commute -> 21kg CO2.
    const co2 = calculateCO2('car', 100);
    expect(co2).toBe(21);
  });

  test('should calculate CO2 correctly for solar energy (zero emissions)', () => {
    const co2 = calculateCO2('solar', 500);
    expect(co2).toBe(0);
  });

  test('should throw error for unknown activity type calculation', () => {
    expect(() => {
      calculateCO2('teleportation', 5);
    }).toThrow('Unknown activity type: teleportation');
  });

  test('should filter factors by category', () => {
    const energyFactors = getFactorsByCategory('energy');
    expect(energyFactors.length).toBeGreaterThan(0);
    energyFactors.forEach((factor) => {
      expect(factor.category).toBe('energy');
    });
  });
});
