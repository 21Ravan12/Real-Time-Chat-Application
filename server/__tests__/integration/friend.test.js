import { jest } from '@jest/globals';
import request from 'supertest';
import User from '../../models/user.model.js';
import Friend from '../../models/friend.model.js';
import Chat from '../../models/chat.model.js';
import { testUser, testUser2 } from '../fixtures/users.js';
import { generateToken } from '../../config/jwt.config.js';
import { FRIEND_STATUS } from '../../utils/constants.js';
import mongoose from 'mongoose';

// We'll dynamically import the server after mocks are set up
let app;

beforeAll(async () => {
  // Import server
  const serverMod = await import('../../server.js');
  app = serverMod.app;
});

describe('Friend Endpoints', () => {
  // Increase timeout for all tests
  jest.setTimeout(60000);

  let authToken, user1, user2, user3;

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({});
    await Friend.deleteMany({});
    await Chat.deleteMany({});

    user1 = await User.create(testUser);
    user2 = await User.create(testUser2);
    user3 = await User.create({
      username: 'user3',
      email: 'user3@test.com',
      password: 'password123'
    });
    
    authToken = generateToken({ id: user1._id });
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Friend.deleteMany({});
    await Chat.deleteMany({});
  });

  // Helper function for generating tokens
  const generateValidToken = (payload = {}) => {
    const id = payload.id || new mongoose.Types.ObjectId().toHexString();
    return generateToken({ id, ...payload });
  };

  describe('GET /api/v1/friends', () => {
    it('should get user friends list', async () => {
      // Create accepted friend relationships
      const friend1 = await Friend.create({
        user: user1._id,
        friend: user2._id,
        status: FRIEND_STATUS.ACCEPTED
      });

      const friend2 = await Friend.create({
        user: user1._id,
        friend: user3._id,
        status: FRIEND_STATUS.ACCEPTED
      });

      const response = await request(app)
        .get('/api/v1/friends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      // Check friend structure
      const friend = response.body.data[0];
      expect(friend).toHaveProperty('_id');
      expect(friend).toHaveProperty('email');
      expect(friend).toHaveProperty('name');
      expect(friend).toHaveProperty('profileImage');
      expect(friend).toHaveProperty('lastSeen');
      expect(friend).toHaveProperty('chatId');
      expect(friend).toHaveProperty('unreadCount', 0);
    });

    it('should return empty array when user has no friends', async () => {
      const response = await request(app)
        .get('/api/v1/friends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/friends')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/friends/requests', () => {
    it('should get pending friend requests', async () => {
      // Create pending friend requests
      await Friend.create({
        user: user2._id,
        friend: user1._id,
        status: FRIEND_STATUS.PENDING
      });

      await Friend.create({
        user: user3._id,
        friend: user1._id,
        status: FRIEND_STATUS.PENDING
      });

      const response = await request(app)
        .get('/api/v1/friends/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should not return accepted friend requests', async () => {
      // Create mixed status requests
      await Friend.create({
        user: user2._id,
        friend: user1._id,
        status: FRIEND_STATUS.PENDING
      });

      await Friend.create({
        user: user3._id,
        friend: user1._id,
        status: FRIEND_STATUS.ACCEPTED
      });

      const response = await request(app)
        .get('/api/v1/friends/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1); // Only pending request
    });
  });

  describe('POST /api/v1/friends/sendFriendRequest', () => {
    it('should send friend request with valid email', async () => {
      const response = await request(app)
        .post('/api/v1/friends/sendFriendRequest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: user2.email
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Friend request sent successfully!');
      expect(response.body.data).toHaveProperty('status', FRIEND_STATUS.PENDING);
      
      // Verify friend request was created
      const friendRequest = await Friend.findOne({
        user: user1._id,
        friend: user2._id
      });
      expect(friendRequest).toBeDefined();
      expect(friendRequest.status).toBe(FRIEND_STATUS.PENDING);

      // Verify chat was created
      const chat = await Chat.findById(friendRequest.chat);
      expect(chat).toBeDefined();
      expect(chat.type).toBe('private');
      expect(chat.participants).toContainEqual(user1._id);
      expect(chat.participants).toContainEqual(user2._id);
    });

    it('should not send friend request to non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/friends/sendFriendRequest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'nonexistent@test.com'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should not send friend request to yourself', async () => {
      const response = await request(app)
        .post('/api/v1/friends/sendFriendRequest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: user1.email
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not send duplicate friend request', async () => {
      // Create initial friend request
      await Friend.create({
        user: user1._id,
        friend: user2._id,
        status: FRIEND_STATUS.PENDING
      });

      const response = await request(app)
        .post('/api/v1/friends/sendFriendRequest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: user2.email
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should not send request if already friends', async () => {
      // Create accepted friend relationship
      await Friend.create({
        user: user1._id,
        friend: user2._id,
        status: FRIEND_STATUS.ACCEPTED
      });

      const response = await request(app)
        .post('/api/v1/friends/sendFriendRequest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: user2.email
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/friends/:id/accept', () => {
    it('should accept friend request', async () => {
      // Create friend request from user2 to user1
      const friendRequest = await Friend.create({
        user: user2._id,
        friend: user1._id,
        status: FRIEND_STATUS.PENDING
      });

      // Create reciprocal pending request
      await Friend.create({
        user: user1._id,
        friend: user2._id,
        status: FRIEND_STATUS.PENDING
      });

      const response = await request(app)
        .patch(`/api/v1/friends/${friendRequest._id}/accept`)
        .set('Authorization', `Bearer ${authToken}`) // user1 accepting request
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(FRIEND_STATUS.ACCEPTED);

      // Verify both friend records are updated
      const updatedRequest = await Friend.findById(friendRequest._id);
      expect(updatedRequest.status).toBe(FRIEND_STATUS.ACCEPTED);

      const reciprocalRequest = await Friend.findOne({
        user: user1._id,
        friend: user2._id
      });
      expect(reciprocalRequest.status).toBe(FRIEND_STATUS.ACCEPTED);
    });

    it('should return 404 for non-existent friend request', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .patch(`/api/v1/friends/${nonExistentId}/accept`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when trying to accept someone else request', async () => {
      // Create request from user2 to user3
      const friendRequest = await Friend.create({
        user: user2._id,
        friend: user3._id,
        status: FRIEND_STATUS.PENDING
      });

      // user1 tries to accept user2's request to user3
      const response = await request(app)
        .patch(`/api/v1/friends/${friendRequest._id}/accept`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid request ID', async () => {
      const response = await request(app)
        .patch('/api/v1/friends/invalid-id/accept')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

 /* describe('DELETE /api/v1/friends/:id', () => {
    it('should remove friend relationship', async () => {
      // Create accepted friend relationship
      const friendRelation = await Friend.create({
        user: user1._id,
        friend: user2._id,
        status: FRIEND_STATUS.ACCEPTED
      });

      const response = await request(app)
        .delete(`/api/v1/friends/${friendRelation._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify friend relationship is removed
      const deletedRelation = await Friend.findById(friendRelation._id);
      expect(deletedRelation).toBeNull();
    });

    it('should remove pending friend request', async () => {
      // Create pending friend request
      const friendRequest = await Friend.create({
        user: user1._id,
        friend: user2._id,
        status: FRIEND_STATUS.PENDING
      });

      const response = await request(app)
        .delete(`/api/v1/friends/${friendRequest._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify friend request is removed
      const deletedRequest = await Friend.findById(friendRequest._id);
      expect(deletedRequest).toBeNull();
    });

    it('should return 404 for non-existent friend relation', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/v1/friends/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when trying to remove someone else friend relation', async () => {
      // Create friend relation between user2 and user3
      const friendRelation = await Friend.create({
        user: user2._id,
        friend: user3._id,
        status: FRIEND_STATUS.ACCEPTED
      });

      // user1 tries to remove user2's friend relation
      const response = await request(app)
        .delete(`/api/v1/friends/${friendRelation._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid friend ID', async () => {
      const response = await request(app)
        .delete('/api/v1/friends/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
*/
  describe('Authentication', () => {
    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/friends')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Friend Request Flow', () => {
    it('should complete full friend request flow', async () => {
      // User1 sends friend request to User2
      const sendResponse = await request(app)
        .post('/api/v1/friends/sendFriendRequest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: user2.email })
        .expect(200);

      expect(sendResponse.body.success).toBe(true);

      // User2 gets pending requests
      const user2Token = generateValidToken({ id: user2._id });
      const requestsResponse = await request(app)
        .get('/api/v1/friends/requests')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(requestsResponse.body.data).toHaveLength(1);
      const requestId = requestsResponse.body.data[0]._id;

      // User2 accepts the request
      const acceptResponse = await request(app)
        .patch(`/api/v1/friends/${requestId}/accept`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(acceptResponse.body.data.status).toBe(FRIEND_STATUS.ACCEPTED);

      // Verify both users see each other as friends
      const user1Friends = await request(app)
        .get('/api/v1/friends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const user2Friends = await request(app)
        .get('/api/v1/friends')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user1Friends.body.data).toHaveLength(1);
      expect(user2Friends.body.data).toHaveLength(1);
    });
  });
});