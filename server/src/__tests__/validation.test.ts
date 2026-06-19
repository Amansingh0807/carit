import { registerSchema, loginSchema, createActivitySchema } from '../validators/schemas';

describe('Zod Validation Schemas', () => {
  describe('Registration Schema', () => {
    test('should pass with valid data', () => {
      const valid = {
        email: 'test@example.com',
        username: 'green_warrior',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.username).toBe('green_warrior');
      }
    });

    test('should fail when passwords do not match', () => {
      const invalid = {
        email: 'test@example.com',
        username: 'green_warrior',
        password: 'Password123!',
        confirmPassword: 'Password1234!',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match');
      }
    });

    test('should fail with simple password', () => {
      const invalid = {
        email: 'test@example.com',
        username: 'green_warrior',
        password: 'simple',
        confirmPassword: 'simple',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('should fail with invalid email', () => {
      const invalid = {
        email: 'invalid-email',
        username: 'green_warrior',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Login Schema', () => {
    test('should pass with valid credentials', () => {
      const valid = {
        email: 'user@example.com',
        password: 'Password123!',
      };
      const result = loginSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('should fail with missing password', () => {
      const invalid = {
        email: 'user@example.com',
        password: '',
      };
      const result = loginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Create Activity Schema', () => {
    test('should pass with valid activity fields', () => {
      const valid = {
        category: 'transportation',
        activity_type: 'car',
        value: 120.5,
        unit: 'km',
        date: '2026-06-18',
      };
      const result = createActivitySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('should fail with invalid category', () => {
      const invalid = {
        category: 'flying_saucer',
        activity_type: 'hover',
        value: 10,
        unit: 'km',
        date: '2026-06-18',
      };
      const result = createActivitySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('should fail with negative value', () => {
      const invalid = {
        category: 'energy',
        activity_type: 'electricity',
        value: -50,
        unit: 'kWh',
        date: '2026-06-18',
      };
      const result = createActivitySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
