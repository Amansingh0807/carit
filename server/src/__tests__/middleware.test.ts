/**
 * @module middleware.test
 * @description Test suite for Express middleware components:
 * - `authenticate` — JWT access token verification
 * - `validate` — Zod schema validation for body/query/params
 * - `errorHandler` — Global error response formatting
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { errorHandler } from '../middleware/errorHandler';
import { loginSchema, createActivitySchema } from '../validators/schemas';

// ────────────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────────────

const ACCESS_SECRET = 'test_middleware_access_secret_123';

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response & { statusCode: number; jsonData: unknown } {
  const res: any = {
    statusCode: 200,
    jsonData: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.jsonData = data;
      return this;
    },
    send(data: unknown) {
      this.jsonData = data;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; jsonData: unknown };
}

// ────────────────────────────────────────────────────────────────────────────
// authenticate middleware
// ────────────────────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  beforeAll(() => {
    process.env['JWT_ACCESS_SECRET'] = ACCESS_SECRET;
    process.env['JWT_REFRESH_SECRET'] = 'test_middleware_refresh_secret';
    process.env['JWT_ACCESS_EXPIRY'] = '15m';
    process.env['JWT_REFRESH_EXPIRY'] = '7d';
    process.env['BCRYPT_ROUNDS'] = '4';
  });

  test('should return 401 when no Authorization header is present', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect((res.jsonData as { message: string }).message).toBe('Access token required');
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when Authorization header has wrong format', () => {
    const req = createMockReq({
      headers: { authorization: 'Basic some-token' } as any,
    });
    const res = createMockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 with invalid token', () => {
    const req = createMockReq({
      headers: { authorization: 'Bearer invalid.token.here' } as any,
    });
    const res = createMockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect((res.jsonData as { message: string }).message).toBe('Invalid or expired access token');
  });

  test('should call next() and set req.user with valid token', () => {
    const token = jwt.sign({ userId: 42, email: 'test@test.com' }, ACCESS_SECRET, {
      expiresIn: 900,
    });

    const req = createMockReq({
      headers: { authorization: `Bearer ${token}` } as any,
    });
    const res = createMockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user?.userId).toBe(42);
    expect(req.user?.email).toBe('test@test.com');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// validate middleware
// ────────────────────────────────────────────────────────────────────────────

describe('validate middleware', () => {
  test('should call next() with valid body data', () => {
    const middleware = validate(loginSchema);
    const req = createMockReq({
      body: { email: 'user@test.com', password: 'Pass1234!' },
    });
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should return 400 with validation errors for invalid body', () => {
    const middleware = validate(loginSchema);
    const req = createMockReq({
      body: { email: 'not-an-email', password: '' },
    });
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    expect((res.jsonData as { success: boolean }).success).toBe(false);
    expect((res.jsonData as { errors: string[] }).errors.length).toBeGreaterThan(0);
  });

  test('should validate query params when field is query', () => {
    const { analyticsQuerySchema } = require('../validators/schemas');
    const middleware = validate(analyticsQuerySchema, 'query');
    const req = createMockReq({
      query: { startDate: '2026-01-01', endDate: '2026-12-31' } as any,
    });
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should reject invalid query params', () => {
    const { analyticsQuerySchema } = require('../validators/schemas');
    const middleware = validate(analyticsQuerySchema, 'query');
    const req = createMockReq({
      query: { startDate: 'not-a-date' } as any,
    });
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(400);
  });

  test('should validate createActivity schema', () => {
    const middleware = validate(createActivitySchema);
    const req = createMockReq({
      body: {
        category: 'transportation',
        activity_type: 'car',
        value: 100,
        unit: 'km',
        date: '2026-06-18',
      },
    });
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// errorHandler middleware
// ────────────────────────────────────────────────────────────────────────────

describe('errorHandler middleware', () => {
  test('should return 500 for generic errors with sanitised message', () => {
    const err = new Error('Database exploded');
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    process.env['NODE_ENV'] = 'production';
    errorHandler(err, req, res, next as NextFunction);

    expect(res.statusCode).toBe(500);
    expect((res.jsonData as { message: string }).message).toBe('Internal server error');
  });

  test('should return custom status code from error', () => {
    const err = Object.assign(new Error('Not found'), { statusCode: 404 });
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next as NextFunction);

    expect(res.statusCode).toBe(404);
    expect((res.jsonData as { message: string }).message).toBe('Not found');
  });

  test('should include stack trace in development mode for 500 errors', () => {
    const err = new Error('Dev error');
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    process.env['NODE_ENV'] = 'development';
    errorHandler(err, req, res, next as NextFunction);

    expect(res.statusCode).toBe(500);
    expect((res.jsonData as { stack?: string }).stack).toBeDefined();
  });

  test('should not include stack trace in production mode', () => {
    const err = new Error('Prod error');
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    process.env['NODE_ENV'] = 'production';
    errorHandler(err, req, res, next as NextFunction);

    expect((res.jsonData as { stack?: string }).stack).toBeUndefined();
  });
});
