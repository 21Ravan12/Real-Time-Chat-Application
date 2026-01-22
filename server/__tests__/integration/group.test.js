import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import User from '../../models/user.model.js';
import Group from '../../models/group.model.js';
import Chat from '../../models/chat.model.js';
import { testUser, testUser2, testUser3 } from '../fixtures/users.js';
import { generateToken } from '../../config/jwt.config.js';
import { GROUP_ROLES } from '../../utils/constants.js';

// We'll dynamically import the server
let app, server;

beforeAll(async () => {
  // Import server
  const serverMod = await import('../../server.js');
  app = serverMod.app;
  server = serverMod.server;
  
  // Clear any existing connections
  await mongoose.connection.close();
  
  // Connect to test database
  await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/test_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  // Close server
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  
  // Close mongoose connection
  await mongoose.connection.close();
  
  // Force exit after timeout to prevent hanging
  await new Promise(resolve => setTimeout(resolve, 1000));
});

describe('Group Endpoints', () => {
  // Increase timeout for all tests
  jest.setTimeout(60000);

  let authToken, user1, user2, user3, group;

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({});
    await Group.deleteMany({});
    await Chat.deleteMany({});

    user1 = await User.create(testUser);
    user2 = await User.create(testUser2);
    user3 = await User.create({
      username: 'user3',
      email: 'user3@test.com',
      password: 'password123'
    });
    
    authToken = generateToken({ id: user1._id });

    // Create a test group
    group = await Group.create({
      name: 'Test Group',
      description: 'Test group description',
      creator: user1._id,
      members: [
        { user: user1._id, role: GROUP_ROLES.CREATOR },
        { user: user2._id, role: GROUP_ROLES.MEMBER }
      ]
    });

    // Create associated chat
    const chat = await Chat.create({
      type: 'group',
      groupId: group._id,
      participants: [user1._id, user2._id]
    });

    group.chat = chat._id;
    await group.save();
  });

  afterEach(async () => {
    // Cleanup after each test
    await User.deleteMany({});
    await Group.deleteMany({});
    await Chat.deleteMany({});
  });

  // Helper function for generating tokens
  const generateValidToken = (payload = {}) => {
    const id = payload.id || new mongoose.Types.ObjectId().toHexString();
    return generateToken({ id, ...payload });
  };

  describe('GET /api/v1/groups', () => {
    it('should get user groups with unread counts', async () => {
      const response = await request(app)
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const userGroup = response.body.data[0];
      expect(userGroup).toHaveProperty('_id');
      expect(userGroup).toHaveProperty('name', 'Test Group');
      expect(userGroup).toHaveProperty('description', 'Test group description');
      expect(userGroup).toHaveProperty('members');
      expect(userGroup).toHaveProperty('creator');
      expect(userGroup).toHaveProperty('unreadCount', 0);
    });

    it('should return empty array when user has no groups', async () => {
      const isolatedUser = await User.create({
        username: 'isolated',
        email: 'isolated@test.com',
        password: 'password123'
      });
      const isolatedToken = generateToken({ id: isolatedUser._id });

      const response = await request(app)
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${isolatedToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/groups')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/groups')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/groups', () => {
    it('should create a new group', async () => {
      const groupData = {
        name: 'New Test Group',
        description: 'New group description',
        avatar: 'avatar-url'
      };

      const response = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(groupData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Group created successfully!');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('name', groupData.name);
      expect(response.body.data).toHaveProperty('description', groupData.description);
      expect(response.body.data).toHaveProperty('creator', user1._id.toString());
      expect(response.body.data.members).toHaveLength(1);
      expect(response.body.data.members[0].role).toBe(GROUP_ROLES.CREATOR);

      // Verify chat was created
      const createdGroup = await Group.findById(response.body.data._id);
      expect(createdGroup.chat).toBeDefined();
      
      const chat = await Chat.findById(createdGroup.chat);
      expect(chat).toBeDefined();
      expect(chat.type).toBe('group');
      expect(chat.groupId.toString()).toBe(createdGroup._id.toString());
    });

    it('should create group with minimum required fields', async () => {
      const groupData = {
        name: 'Minimal Group'
      };

      const response = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(groupData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(groupData.name);
      expect(response.body.data.description).toBeUndefined();
    });

    it('should not create group without name', async () => {
      const groupData = {
        description: 'Group without name'
      };

      const response = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(groupData)
        .expect(400);

      expect(response.body.success).toBe(false);
  
      // Add this to ensure the request completes
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should return 401 without authentication', async () => {
      const groupData = { name: 'Test Group' };

      const response = await request(app)
        .post('/api/v1/groups')
        .send(groupData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/groups/:id', () => {
    it('should get group details for member', async () => {
      const response = await request(app)
        .get(`/api/v1/groups/${group._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id', group._id.toString());
      expect(response.body.data).toHaveProperty('name', group.name);
      expect(response.body.data).toHaveProperty('description', group.description);
      expect(response.body.data).toHaveProperty('members');
      expect(Array.isArray(response.body.data.members)).toBe(true);
      expect(response.body.data.members).toHaveLength(2);
    });

    it('should return 404 for non-existent group', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/groups/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when user is not a group member', async () => {
      const nonMemberToken = generateToken({ id: user3._id });

      const response = await request(app)
        .get(`/api/v1/groups/${group._id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid group ID', async () => {
      const response = await request(app)
        .get('/api/v1/groups/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/groups/${group._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/groups/:id', () => {
    it('should update group details for creator', async () => {
      const updateData = {
        name: 'Updated Group Name',
        description: 'Updated description',
        avatar: 'updated-avatar-url'
      };

      const response = await request(app)
        .patch(`/api/v1/groups/${group._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', updateData.name);
      expect(response.body.data).toHaveProperty('description', updateData.description);
    });

    it('should update group details for admin', async () => {
      // Make user2 an admin
      await Group.findByIdAndUpdate(group._id, {
        $set: {
          'members.$[elem].role': GROUP_ROLES.ADMIN
        }
      }, {
        arrayFilters: [{ 'elem.user': user2._id }]
      });

      const adminToken = generateToken({ id: user2._id });
      const updateData = {
        name: 'Admin Updated Name'
      };

      const response = await request(app)
        .patch(`/api/v1/groups/${group._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 403 when regular member tries to update group', async () => {
      const memberToken = generateToken({ id: user2._id });
      const updateData = {
        name: 'Member Updated Name'
      };

      const response = await request(app)
        .patch(`/api/v1/groups/${group._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent group', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .patch(`/api/v1/groups/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .patch(`/api/v1/groups/${group._id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid group ID', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .patch('/api/v1/groups/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/groups/:id/members', () => {
    it('should add member to group by email', async () => {
      const response = await request(app)
        .post(`/api/v1/groups/${group._id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: user3.email,
          role: GROUP_ROLES.MEMBER
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toHaveLength(3);
      
      // Verify new member was added
      const newMember = response.body.data.members.find(
        m => m.user._id === user3._id.toString()
      );
      expect(newMember).toBeDefined();
      expect(newMember.role).toBe(GROUP_ROLES.MEMBER);
    });

    it('should add member with default role when not specified', async () => {
      const response = await request(app)
        .post(`/api/v1/groups/${group._id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: user3.email
        })
        .expect(200);

      const newMember = response.body.data.members.find(
        m => m.user._id === user3._id.toString()
      );
      expect(newMember.role).toBe(GROUP_ROLES.MEMBER);
    });

    it('should return 404 for non-existent user email', async () => {
      const response = await request(app)
        .post(`/api/v1/groups/${group._id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'nonexistent@test.com',
          role: GROUP_ROLES.MEMBER
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 when adding existing member', async () => {
      const response = await request(app)
        .post(`/api/v1/groups/${group._id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: user2.email, // Already a member
          role: GROUP_ROLES.MEMBER
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when non-admin tries to add member', async () => {
      const memberToken = generateToken({ id: user2._id });

      const response = await request(app)
        .post(`/api/v1/groups/${group._id}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          email: user3.email,
          role: GROUP_ROLES.MEMBER
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent group', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/v1/groups/${nonExistentId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: user3.email,
          role: GROUP_ROLES.MEMBER
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/groups/${group._id}/members`)
        .send({
          email: user3.email,
          role: GROUP_ROLES.MEMBER
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid group ID', async () => {
      const response = await request(app)
        .post('/api/v1/groups/invalid-id/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: user3.email,
          role: GROUP_ROLES.MEMBER
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/groups/:id', () => {
    it('should delete group when user is creator', async () => {
      const response = await request(app)
        .delete(`/api/v1/groups/${group._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify group was deleted
      const deletedGroup = await Group.findById(group._id);
      expect(deletedGroup).toBeNull();

      // Verify associated chat was deleted
      const deletedChat = await Chat.findById(group.chat);
      expect(deletedChat).toBeNull();
    });

    it('should return 403 when non-creator tries to delete group', async () => {
      const memberToken = generateToken({ id: user2._id });

      const response = await request(app)
        .delete(`/api/v1/groups/${group._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent group', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/v1/groups/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/groups/${group._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid group ID', async () => {
      const response = await request(app)
        .delete('/api/v1/groups/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity between group and chat', async () => {
      // Get group with populated chat
      const populatedGroup = await Group.findById(group._id).populate('chat');
      expect(populatedGroup.chat).toBeDefined();
      expect(populatedGroup.chat.groupId.toString()).toBe(group._id.toString());
    });

    it('should properly clean up related data when group is deleted', async () => {
      // Create another group with chat for testing cleanup
      const testGroup = await Group.create({
        name: 'Cleanup Test Group',
        creator: user1._id,
        members: [{ user: user1._id, role: GROUP_ROLES.CREATOR }]
      });

      const testChat = await Chat.create({
        type: 'group',
        groupId: testGroup._id,
        participants: [user1._id]
      });

      testGroup.chat = testChat._id;
      await testGroup.save();

      // Delete the group
      await request(app)
        .delete(`/api/v1/groups/${testGroup._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify both group and chat were deleted
      const deletedGroup = await Group.findById(testGroup._id);
      const deletedChat = await Chat.findById(testChat._id);
      
      expect(deletedGroup).toBeNull();
      expect(deletedChat).toBeNull();
    });
  });
});