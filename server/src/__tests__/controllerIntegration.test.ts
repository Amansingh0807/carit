import request from 'supertest';
import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import { initDatabase, closeDatabase, getDatabase, resetDatabase } from '../database/connection';
import { runMigrations, seedData } from '../database/migrations';
import { errorHandler } from '../middleware/errorHandler';

// Route imports
import authRoutes from '../routes/authRoutes';
import activityRoutes from '../routes/activityRoutes';
import analyticsRoutes from '../routes/analyticsRoutes';
import recommendationRoutes from '../routes/recommendationRoutes';
import gamificationRoutes from '../routes/gamificationRoutes';

const TEST_DB_PATH = './data/test_integration.db';
let app: Express;
let accessToken: string = '';
let refreshToken: string = '';
let createdActivityId: number;

describe('Controller & Router Integration Tests', () => {
  beforeAll(async () => {
    // Setup environment variables for test execution
    process.env['DB_PATH'] = TEST_DB_PATH;
    process.env['JWT_ACCESS_SECRET'] = 'test_integration_access_secret_123456789';
    process.env['JWT_REFRESH_SECRET'] = 'test_integration_refresh_secret_123456789';
    process.env['JWT_ACCESS_EXPIRY'] = '15m';
    process.env['JWT_REFRESH_EXPIRY'] = '7d';
    process.env['BCRYPT_ROUNDS'] = '4'; // Faster bcrypt for tests

    // Clean up leftover DB file if exists
    const resolvedPath = path.resolve(TEST_DB_PATH);
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }

    resetDatabase();
    await initDatabase();
    const db = getDatabase();
    runMigrations(db);
    await seedData(db, { seedDemoUser: true, bcryptRounds: 4 });

    // Initialize express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Register routes
    app.use('/api/auth', authRoutes);
    app.use('/api/activities', activityRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/recommendations', recommendationRoutes);
    app.use('/api/gamification', gamificationRoutes);

    // Global error handler middleware
    app.use(errorHandler);
  });

  afterAll(async () => {
    closeDatabase();
    const resolvedPath = path.resolve(TEST_DB_PATH);
    if (fs.existsSync(resolvedPath)) {
      try {
        fs.unlinkSync(resolvedPath);
      } catch (err) {
        // Ignore file cleanup errors
      }
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Auth Routes
  // ────────────────────────────────────────────────────────────────────────────
  describe('Auth Endpoints', () => {
    const testUser = {
      email: 'integration@example.com',
      username: 'integration_user',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should login user and return tokens', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      accessToken = res.body.data.tokens.accessToken;
      refreshToken = res.body.data.tokens.refreshToken;
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return user details on getMe endpoint with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should reject getMe request with missing token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should refresh access token using valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    it('should reject refresh with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid_refresh_token_string' });

      expect(res.status).toBe(401);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Activities Routes
  // ────────────────────────────────────────────────────────────────────────────
  describe('Activities Endpoints', () => {
    it('should retrieve list of emission factors', async () => {
      const res = await request(app)
        .get('/api/activities/emission-factors')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should log a new activity and estimate co2', async () => {
      const activityData = {
        category: 'transportation',
        activity_type: 'car',
        value: 100,
        unit: 'km',
        description: 'Test integration commute',
        date: new Date().toISOString().split('T')[0],
      };

      const res = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(activityData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activity).toHaveProperty('id');
      expect(res.body.data.activity.co2_kg).toBeGreaterThan(0);
      createdActivityId = res.body.data.activity.id;
    });

    it('should reject invalid activity schema validation', async () => {
      const badData = {
        category: 'invalid_category',
        value: -50,
      };

      const res = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(badData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should retrieve logged activities with pagination', async () => {
      const res = await request(app)
        .get('/api/activities?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(Number(res.body.pagination.page)).toBe(1);
    });

    it('should update an existing activity', async () => {
      const updateData = {
        category: 'transportation',
        activity_type: 'car',
        value: 150, // Updated value
        unit: 'km',
        description: 'Updated commute description',
        date: new Date().toISOString().split('T')[0],
      };

      const res = await request(app)
        .put(`/api/activities/${createdActivityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activity.value).toBe(150);
    });

    it('should return 404 when updating non-existent activity', async () => {
      const updateData = {
        category: 'transportation',
        activity_type: 'car',
        value: 150,
        unit: 'km',
        date: new Date().toISOString().split('T')[0],
      };

      const res = await request(app)
        .put('/api/activities/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Analytics Routes
  // ────────────────────────────────────────────────────────────────────────────
  describe('Analytics Endpoints', () => {
    it('should retrieve analytics summary', async () => {
      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total_co2_kg');
      expect(res.body.data).toHaveProperty('category_breakdown');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Gamification Routes
  // ────────────────────────────────────────────────────────────────────────────
  describe('Gamification Endpoints', () => {
    it('should retrieve achievements', async () => {
      const res = await request(app)
        .get('/api/gamification/achievements')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('earned');
      expect(res.body.data).toHaveProperty('available');
    });

    it('should retrieve user streak', async () => {
      const res = await request(app)
        .get('/api/gamification/streak')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('current_streak');
      expect(res.body.data).toHaveProperty('longest_streak');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Recommendation Routes
  // ────────────────────────────────────────────────────────────────────────────
  describe('Recommendation Endpoints', () => {
    it('should retrieve list of recommendations', async () => {
      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Cleanup / Remaining CRUD
  // ────────────────────────────────────────────────────────────────────────────
  describe('Cleanup & Remaining Checks', () => {
    it('should delete activity successfully', async () => {
      const res = await request(app)
        .delete(`/api/activities/${createdActivityId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when deleting already deleted activity', async () => {
      const res = await request(app)
        .delete(`/api/activities/${createdActivityId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it('should logout user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
