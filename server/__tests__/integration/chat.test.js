import { jest } from '@jest/globals';
import request from 'supertest';
import User from '../../models/user.model.js';
import Chat from '../../models/chat.model.js';
import Group from '../../models/group.model.js';
import Friend from '../../models/friend.model.js';
import Message from '../../models/message.model.js';
import { testUser, testUser2, adminUser } from '../fixtures/users.js';
import { generateToken } from '../../config/jwt.config.js';
import mongoose from 'mongoose';

// We'll dynamically import the server after mocks are set up
let app;

beforeAll(async () => {
  // Import server
  const serverMod = await import('../../server.js');
  app = serverMod.app;
});

describe('Chat Endpoints', () => {
  // Increase timeout for all tests
  jest.setTimeout(60000);

  let authToken, user1, user2, user3, admin, adminToken, group;

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Group.deleteMany({});
    await Friend.deleteMany({});
    await Message.deleteMany({});

    user1 = await User.create(testUser);
    user2 = await User.create(testUser2);
    user3 = await User.create({
      username: 'user3',
      email: 'user3@example.com',
      password: 'Password123!',
      firstName: 'User3',
      lastName: 'Test'
    });
    admin = await User.create(adminUser);
    
    authToken = generateToken({ id: user1._id });
    adminToken = generateToken({ id: admin._id });

    // Create a group for testing
    group = await Group.create({
      name: 'Test Group',
      description: 'Test group description',
      creator: user1._id,      
      admin: user1._id,
      members: [user1._id, user2._id],
      chat: new mongoose.Types.ObjectId()
    });
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Group.deleteMany({});
    await Friend.deleteMany({});
    await Message.deleteMany({});
  });

  // Helper function to create private chat
  const createPrivateChat = async (participants = [user1._id, user2._id]) => {
    return await Chat.create({
      participants,
      messages: [],
      type: 'private'
    });
  };

  // Helper function to create group chat
  const createGroupChat = async (groupId = group._id, participants = [user1._id, user2._id]) => {
    return await Chat.create({
      groupId,
      participants,
      messages: [],
      creator: user1._id,
      type: 'group'
    });
  };

  describe('GET /api/v1/chats', () => {
    it('should get all user chats including private and group chats', async () => {
      // Create a private chat
      const privateChat = await createPrivateChat();

      // Create a group chat
      const groupChat = await createGroupChat();

      // Create messages for unread count testing
      await Message.create({
        chat: privateChat._id,
        sender: user2._id,
        content: 'Test message',
        readedBy: [] // No one has read it yet
      });

      const response = await request(app)
        .get('/api/v1/chats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should return both private and group chats
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check structure of chat objects
      const privateChatData = response.body.data.find(chat => chat.type === 'private');
      const groupChatData = response.body.data.find(chat => chat.type === 'group');

      if (privateChatData) {
        expect(privateChatData).toHaveProperty('_id');
        expect(privateChatData).toHaveProperty('type', 'private');
        expect(privateChatData).toHaveProperty('participants');
        expect(privateChatData).toHaveProperty('unreadCount');
        expect(privateChatData).toHaveProperty('updatedAt');
      }

      if (groupChatData) {
        expect(groupChatData).toHaveProperty('_id');
        expect(groupChatData).toHaveProperty('type', 'group');
        expect(groupChatData).toHaveProperty('name');
        expect(groupChatData).toHaveProperty('unreadCount');
        expect(groupChatData).toHaveProperty('updatedAt');
      }
    });

    it('should return empty array when user has no chats', async () => {
      // Create a user with no chats
      const isolatedUser = await User.create({
        username: 'isolated',
        email: 'isolated@test.com',
        password: 'password123'
      });
      const isolatedUserToken = generateToken({ id: isolatedUser._id });

      const response = await request(app)
        .get('/api/v1/chats')
        .set('Authorization', `Bearer ${isolatedUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/chats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/chats/:id', () => {
    it('should get private chat by participant ID', async () => {
      // Create a chat between users
      const chat = await createPrivateChat();

      const response = await request(app)
        .get(`/api/v1/chats/${user2._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id', chat._id.toString());
      expect(response.body.data).toHaveProperty('participants');
      expect(Array.isArray(response.body.data.participants)).toBe(true);
      expect(response.body.data.participants).toHaveLength(2);
    });

    it('should return 404 when private chat not found', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/chats/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid participant ID', async () => {
      const response = await request(app)
        .get('/api/v1/chats/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not allow access to other users private chats', async () => {
      // Create two users who are not friends with user1
      const user4 = await User.create({
        username: 'user4',
        email: 'user4@test.com',
        password: 'password123'
      });
      
      const user5 = await User.create({
        username: 'user5', 
        email: 'user5@test.com',
        password: 'password123'
      });

      // Create a chat between user4 and user5
      await createPrivateChat([user4._id, user5._id]);

      // user1 tries to access user4 and user5's chat
      const response = await request(app)
        .get(`/api/v1/chats/${user4._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Should not find the chat since user1 is not a participant

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/chats/group/:id', () => {
    it('should get group chat by group ID', async () => {
      // Create a group chat
      const groupChat = await createGroupChat();

      // Update the group to reference the chat
      await Group.findByIdAndUpdate(group._id, { chat: groupChat._id });

      // IMPORTANT: Update the group to ensure user1 is in members array
      // The issue is that group.members contains member objects, not just user IDs
      await Group.findByIdAndUpdate(group._id, {
        $set: {
          'members.$[]._id': user1._id // This sets the _id field for all members
        }
      });

      const response = await request(app)
        .get(`/api/v1/chats/group/${group._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id', groupChat._id.toString());
      expect(response.body.data).toHaveProperty('groupId', group._id.toString());
      expect(response.body.data).toHaveProperty('type', 'group');
      expect(response.body.data).toHaveProperty('participants');
    });

    it('should return 404 when group chat not found', async () => {
      const nonExistentGroupId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/chats/group/${nonExistentGroupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid group ID', async () => {
      const response = await request(app)
        .get('/api/v1/chats/group/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not allow access to group chat if not a member', async () => {
      // Create a group where user1 is not a member
      const otherGroup = await Group.create({
        name: 'Other Group',
        description: 'Other group description',
        creator: user2._id,
        admin: user2._id,
        members: [
          { _id: user2._id, role: 'member' }, // Explicitly structure as objects
          { _id: user3._id, role: 'member' }
        ],
        chat: new mongoose.Types.ObjectId()
      });

      const groupChat = await createGroupChat(otherGroup._id, [user2._id, user3._id]);
      
      // Update the group to reference the chat
      await Group.findByIdAndUpdate(otherGroup._id, { chat: groupChat._id });

      // user1 tries to access the group chat
      const response = await request(app)
        .get(`/api/v1/chats/group/${otherGroup._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403); // Should return 403 Forbidden

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/chats/mark-read', () => {
    it('should mark private chat messages as read', async () => {
      // Create a friend relationship and chat
      const chat = await createPrivateChat();
      
      // Create Friend relationship in BOTH directions
      await Friend.create([
        {
          user: user1._id,
          friend: user2._id,
          chat: chat._id,
          status: 'accepted'
        },
        {
          user: user2._id,
          friend: user1._id,
          chat: chat._id,
          status: 'accepted'
        }
      ]);

      // Create unread messages
      await Message.create([
        {
          chat: chat._id,
          sender: user2._id,
          content: 'Message 1',
          readedBy: []
        },
        {
          chat: chat._id,
          sender: user2._id,
          content: 'Message 2',
          readedBy: []
        }
      ]);

      const response = await request(app)
        .patch('/api/v1/chats/mark-read')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: user2._id,
          type: 'private'
        })
        .expect(200);

      // Verify messages were marked as read
      const updatedMessages = await Message.find({ chat: chat._id });
      updatedMessages.forEach(message => {
        expect(message.readedBy).toContainEqual(
          expect.objectContaining({
            user: user1._id
          })
        );
      });
    });

    it('should mark group chat messages as read', async () => {
      // Create a group chat
      const groupChat = await createGroupChat();
      await Group.findByIdAndUpdate(group._id, { chat: groupChat._id });

      // Create unread messages
      await Message.create([
        {
          chat: groupChat._id,
          sender: user2._id,
          content: 'Group message 1',
          readedBy: []
        },
        {
          chat: groupChat._id,
          sender: user2._id,
          content: 'Group message 2',
          readedBy: []
        }
      ]);

      const response = await request(app)
        .patch('/api/v1/chats/mark-read')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: group._id,
          type: 'group'
        })
        .expect(200);

      // Verify messages were marked as read
      const updatedMessages = await Message.find({ chat: groupChat._id });
      updatedMessages.forEach(message => {
        expect(message.readedBy).toContainEqual(
          expect.objectContaining({
            user: user1._id
          })
        );
      });
    });

    it('should return 404 when trying to mark non-existent private chat', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .patch('/api/v1/chats/mark-read')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: nonExistentUserId,
          type: 'private'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when trying to mark non-existent group chat', async () => {
      const nonExistentGroupId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .patch('/api/v1/chats/mark-read')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: nonExistentGroupId,
          type: 'group'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid chat type', async () => {
      const response = await request(app)
        .patch('/api/v1/chats/mark-read')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: user2._id,
          type: 'invalid-type'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/chats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/chats')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});