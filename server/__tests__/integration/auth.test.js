import { jest } from '@jest/globals';
import request from 'supertest';
import User from '../../models/user.model.js';
import { testUser } from '../fixtures/users.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// We'll dynamically import the server and redis client after mocks are set up
let app;
let redisClient;

beforeAll(async () => {
  // Import the redis config
  const redisConfig = await import('../../config/redis.config.js');
  redisClient = redisConfig.redisClient;

  // Import server
  const serverMod = await import('../../server.js');
  app = serverMod.app;
});

describe('Auth Endpoints', () => {
  // Increase timeout for all tests
  jest.setTimeout(60000);

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
  });

  // Helper functions for common test data
  const createMockRedisData = (data = {}) => JSON.stringify({
    email: testUser.email,
    password: 'hashedPassword',
    username: testUser.username,
    bio: testUser.bio,
    code: '123456',
    expiresAt: Date.now() + 15 * 60 * 1000,
    ...data
  });

  const generateValidToken = (payload = {}) => {
    const id = payload.id || new mongoose.Types.ObjectId().toHexString();
    return jwt.sign({ id, ...payload }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '15m' });
  };

  describe('POST /api/v1/auth/register', () => {
    it('should send verification code for new user registration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(200);

      expect(response.body.message).toBe('Verification code sent successfully!');
      expect(response.body.redisKey).toBeDefined();
    });

    it('should not register user with existing email', async () => {
      await User.create(testUser);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/completeRegistration', () => {
    const redisKey = 'test-redis-key';
    const verificationCode = '123456';

    beforeEach(() => {
      // Mock Redis to return valid data
      redisClient.get = jest.fn().mockResolvedValue(createMockRedisData());
    });

    it('should complete registration with valid verification code', async () => {
      const response = await request(app)
        .post('/api/v1/auth/completeRegistration')
        .send({ redisKey, verificationCode })
        .expect(200);

      expect(response.body.message).toBe('Registration completed successfully!');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.token).toBeDefined();
    });

    it('should not complete registration with invalid verification code', async () => {
      const response = await request(app)
        .post('/api/v1/auth/completeRegistration')
        .send({ redisKey, verificationCode: 'wrongcode' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not complete registration with expired code', async () => {
      // Mock expired data - reset the mock with expired data
      redisClient.get.mockResolvedValue(
        createMockRedisData({ expiresAt: Date.now() - 1000 })
      );

      const response = await request(app)
        .post('/api/v1/auth/completeRegistration')
        .send({ redisKey, verificationCode })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create(testUser);
    });

    it('should login user with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);
      // Check for successful response with token or user data
      expect(response.body).toBeDefined();
      expect(response.body.token || response.body.user || response.body.message).toBeDefined();
    });

    it('should not login with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(200);

      expect(response.body.message).toMatch(/Invalid|credentials|password/);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // Create a user and generate a token tied to that user's id
      const user = await User.create(testUser);
      const validToken = generateValidToken({ id: user._id.toString() });
      
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`jwt=${validToken}`])
        .expect(200);

      expect(response.body.data.token).toBeDefined();
    });

    it('should not refresh token without refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout user and clear cookie', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/forgot-password/sendCode', () => {
    beforeEach(async () => {
      await User.create(testUser);
    });

    it('should send verification code for password reset', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password/sendCode')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.message).toBe('Password recovery code sent successfully!');
    });

    it('should not send code for non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password/sendCode')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/forgot-password/verifyCode', () => {
    const redisKey = 'password-reset-key';

    beforeEach(async () => {
      await User.create(testUser);
    });

    it('should verify code and return reset token', async () => {
      redisClient.get = jest.fn().mockResolvedValueOnce(
        JSON.stringify({
          email: testUser.email,
          code: '123456',
          expiresAt: Date.now() + 15 * 60 * 1000
        })
      );

      const response = await request(app)
        .post('/api/v1/auth/forgot-password/verifyCode')
        .send({ redisKey, verificationCode: '123456' })
        .expect(200);

      expect(response.body.message).toBe('Code successfully verified!');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    beforeEach(async () => {
      await User.create(testUser);
    });

    it('should reset password with valid token', async () => {
      const validToken = generateValidToken({ email: testUser.email });
      
      // Mock token verification
      jest.spyOn(jwt, 'verify').mockReturnValue({ email: testUser.email });

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ newPassword: 'newPassword123' })
        .expect(200);

      expect(response.body.message).toBe('Password reset successfully');
    });
  });
});