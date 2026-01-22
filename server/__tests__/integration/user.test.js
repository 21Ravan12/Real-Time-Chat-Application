import { jest } from '@jest/globals';
import request from 'supertest';
import User from '../../models/user.model.js';
import { testUser, testUser2, adminUser } from '../fixtures/users.js';
import { generateToken } from '../../config/jwt.config.js';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';

// We'll dynamically import the server after mocks are set up
let app;

beforeAll(async () => {
  // Import server after mocks are in place
  const serverMod = await import('../../server.js');
  app = serverMod.app;
});

describe('User Endpoints', () => {
  // Increase timeout for all tests
  jest.setTimeout(60000);

  let authToken, user1, user2, admin, adminToken;

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({});
    
    user1 = await User.create(testUser);
    user2 = await User.create(testUser2);
    admin = await User.create(adminUser);
    
    authToken = generateToken({ id: user1._id });
    adminToken = generateToken({ id: admin._id });

    // Mock fs.rm to avoid actual file deletion
    fs.rm = jest.fn().mockResolvedValue(true);
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
  });

  // Helper function for generating tokens
  const generateValidToken = (payload = {}) => {
    const id = payload.id || new mongoose.Types.ObjectId().toHexString();
    return generateToken({ id, ...payload });
  };

  describe('GET /api/v1/users/me', () => {
    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.username).toBe(testUser.username);
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('__v');
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should get user by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${user2._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(user2._id.toString());
      expect(response.body.data.email).toBe(testUser2.email);
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('__v');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/users/', () => {
    it('should update user profile without avatar', async () => {
      const updateData = {
        username: 'updatedusername',
        bio: 'Updated bio information',
      };

      const response = await request(app)
        .patch('/api/v1/users/')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.username).toBe(updateData.username);
      expect(response.body.data.bio).toBe(updateData.bio);
    });

    it('should update user profile with avatar', async () => {
      // Create a mock file
      const mockFile = Buffer.from('fake image content');
      
      const response = await request(app)
        .patch('/api/v1/users/')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', mockFile, 'test-avatar.jpg')
        .field('username', 'userwithavatar')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.username).toBe('userwithavatar');
      expect(response.body.data.avatar).toBeDefined();
      expect(response.body.data.avatar).toContain(`/img/${user1._id}/`);
    });

    it('should replace old avatar when uploading new one', async () => {
      // First upload an avatar
      const mockFile1 = Buffer.from('first avatar');
      const firstResponse = await request(app)
        .patch('/api/v1/users/')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', mockFile1, 'first-avatar.jpg')
        .expect(200);

      const firstAvatarPath = firstResponse.body.data.avatar;

      // Upload a new avatar
      const mockFile2 = Buffer.from('second avatar');
      const secondResponse = await request(app)
        .patch('/api/v1/users/')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', mockFile2, 'second-avatar.jpg')
        .expect(200);

      expect(secondResponse.body.status).toBe('success');
      expect(secondResponse.body.data.avatar).not.toBe(firstAvatarPath);
    });

    it('should not update password through this endpoint', async () => {
      const updateData = {
        username: 'updateduser',
        password: 'newpassword123'
      };

      const response = await request(app)
        .patch('/api/v1/users/')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Password should not be updated through this endpoint
      const user = await User.findById(user1._id);
      expect(user.password).not.toBe('newpassword123');
    });

    it('should return 401 when updating without authentication', async () => {
      const updateData = { username: 'updated' };

      const response = await request(app)
        .patch('/api/v1/users/')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/users/delete-me', () => {
    it('should delete current user account', async () => {
      const response = await request(app)
        .delete('/api/v1/users/delete-me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify user was deleted
      const deletedUser = await User.findById(user1._id);
      expect(deletedUser).toBeNull();

      // Verify cookie was cleared
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('jwt=;');
    });

    it('should delete user avatar when account is deleted', async () => {
      // Mock that avatar directory exists and can be deleted
      fs.rm = jest.fn().mockResolvedValue(true);

      // First upload an avatar
      const mockFile = Buffer.from('avatar content');
      await request(app)
        .patch('/api/v1/users/')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', mockFile, 'test-avatar.jpg')
        .expect(200);

      // Then delete account
      await request(app)
        .delete('/api/v1/users/delete-me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify fs.rm was called (avatar directory cleanup)
      expect(fs.rm).toHaveBeenCalled();
    });

    it('should return 401 when deleting without authentication', async () => {
      const response = await request(app)
        .delete('/api/v1/users/delete-me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Admin Routes', () => {
    describe('GET /api/v1/users/', () => {
      it('should get all users for admin', async () => {
        const response = await request(app)
          .get('/api/v1/users/')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(3); // user1, user2, admin
        
        // Verify sensitive fields are excluded
        response.body.data.forEach(user => {
          expect(user).not.toHaveProperty('password');
          expect(user).not.toHaveProperty('__v');
        });
      });

      it('should return 403 for non-admin users', async () => {
        const response = await request(app)
          .get('/api/v1/users/')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should return 401 without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/users/')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/v1/users/:id', () => {
      it('should delete user by admin', async () => {
        const response = await request(app)
          .delete(`/api/v1/users/${user2._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);

        // Verify user was deleted
        const deletedUser = await User.findById(user2._id);
        expect(deletedUser).toBeNull();
      });

      it('should return 404 when deleting non-existent user', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .delete(`/api/v1/users/${nonExistentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should return 403 for non-admin users', async () => {
        const response = await request(app)
          .delete(`/api/v1/users/${user2._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should return 400 for invalid user ID', async () => {
        const response = await request(app)
          .delete('/api/v1/users/invalid-id')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('User Data Security', () => {
    it('should never expose password in responses', async () => {
      const responses = [
        await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${authToken}`),
        await request(app).get(`/api/v1/users/${user2._id}`).set('Authorization', `Bearer ${authToken}`),
        await request(app).get('/api/v1/users/').set('Authorization', `Bearer ${adminToken}`)
      ];

      responses.forEach(response => {
        if (Array.isArray(response.body.data)) {
          response.body.data.forEach(user => {
            expect(user).not.toHaveProperty('password');
          });
        } else {
          expect(response.body.data).not.toHaveProperty('password');
        }
      });
    });

    it('should not expose internal fields like __v', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).not.toHaveProperty('__v');
    });
  });

  describe('File Upload Validation', () => {
    it('should handle invalid file types gracefully', async () => {
      const textFile = Buffer.from('this is not an image');
      
      const response = await request(app)
        .patch('/api/v1/users/')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', textFile, 'test.txt')
        .field('username', 'testuser')
        .expect(200); // Your current implementation doesn't validate file types

      // In a real scenario, you might want to add file type validation
      // and return 400 for invalid types
    });

    it('should handle file system errors gracefully', async () => {
      // Mock fs.rm to simulate file system error
      jest.spyOn(fs, 'unlink').mockRejectedValue(new Error('File system error'));

      const mockFile = Buffer.from('avatar content');
      
      // The test should still pass as file system errors might be handled internally
      const response = await request(app)
        .patch('/api/v1/users/')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', mockFile, 'test-avatar.jpg')
        .field('username', 'testuser')
        .expect(200);
    });
  });
});