import Friend from '../../models/friend.model.js';
import User from '../../models/user.model.js';
import Chat from '../../models/chat.model.js';
import { FRIEND_STATUS, ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import ChatService from '../../api/services/chat.service.js';
import AppError from '../../utils/appError.js';
import logger from '../../utils/logger.js';

export default class FriendService {
  static async getFriends(userId) {
    try {
      const friends = await Friend.find({
        $or: [{ user: userId }],
        status: FRIEND_STATUS.ACCEPTED // Only get accepted friends
      })
        .populate('friend', 'username avatar email lastSeen');

      const formattedFriends = await Promise.all(
        friends.map(async f => {
          const chatId = f.chat || null;
          let unreadCount = 0;
          if (chatId) {
            unreadCount = await ChatService.getUnreadCount(chatId, userId);
          }
          return {
            _id: f.friend._id,
            email: f.friend.email,
            name: f.friend.username,
            profileImage: f.friend.avatar,
            lastSeen: f.friend.lastSeen,
            chatId: chatId,
            unreadCount: unreadCount || 0
          };
        })
      );

      return formattedFriends;
    } catch (error) {
      logger.error(`Get friends error: ${error.message}`);
      throw error;
    }
  }

  // ADD THIS METHOD - FIXES THE 500 ERROR
  static async getFriendRequests(userId) {
    try {
      const requests = await Friend.find({
        $or: [
          { user: userId, status: FRIEND_STATUS.PENDING },
          { friend: userId, status: FRIEND_STATUS.PENDING }
        ]
      })
        .populate('user friend', 'username avatar email')
        .sort({ createdAt: -1 });

      return requests.map(request => {
        const isIncoming = request.friend._id.equals(userId);
        return {
          _id: request._id,
          type: isIncoming ? 'incoming' : 'outgoing',
          sender: request.user,
          receiver: request.friend,
          status: request.status,
          createdAt: request.createdAt
        };
      });
    } catch (error) {
      logger.error(`Get friend requests error: ${error.message}`);
      throw error;
    }
  }

  static async sendFriendRequest(userId, email) {
    try {
      const friendUser = await User.findOne({ email });
      if (!friendUser) {
        throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
      }

      if (friendUser._id.equals(userId)) {
        throw new AppError('You cannot send friend request to yourself', HTTP_STATUS.BAD_REQUEST);
      }

      // Check for existing requests in either direction
      const existingRequest = await Friend.findOne({
        $or: [
          { user: userId, friend: friendUser._id },
          { user: friendUser._id, friend: userId }
        ]
      });

      if (existingRequest) {
        if (existingRequest.status === FRIEND_STATUS.PENDING) {
          throw new AppError('Friend request already exists', HTTP_STATUS.CONFLICT);
        } else if (existingRequest.status === FRIEND_STATUS.ACCEPTED) {
          throw new AppError('You are already friends', HTTP_STATUS.CONFLICT);
        } else if (existingRequest.status === FRIEND_STATUS.REJECTED) {
          throw new AppError('Friend request was previously rejected', HTTP_STATUS.CONFLICT);
        }
      }

      // Create a new private chat
      const chat = await Chat.create({
        type: 'private',
        participants: [userId, friendUser._id]
      });

      // Create friend request (only one document)
      const friendRequest = await Friend.create({
        user: userId,
        friend: friendUser._id,
        status: FRIEND_STATUS.PENDING,
        chat: chat._id
      });

      return await friendRequest.populate('user friend', 'username avatar');
    } catch (error) {
      logger.error(`Send friend request error: ${error.message}`);
      throw error;
    }
  }

  static async acceptFriendRequest(requestId, userId) {
    try {
      const request = await Friend.findById(requestId)
        .populate('user friend', 'username avatar');

      if (!request) {
        throw new AppError('Friend request not found', HTTP_STATUS.NOT_FOUND);
      }

      // Only the receiver can accept
      if (!request.friend._id.equals(userId)) {
        throw new AppError('Not authorized to accept this request', HTTP_STATUS.FORBIDDEN);
      }

      // Accept the request
      request.status = FRIEND_STATUS.ACCEPTED;
      await request.save();

      // Create reciprocal friendship (optional - depends on your design)
      const reciprocalRequest = await Friend.findOneAndUpdate(
        { user: request.friend._id, friend: request.user._id },
        { 
          status: FRIEND_STATUS.ACCEPTED,
          chat: request.chat // Use same chat
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true 
        }
      );

      return request;
    } catch (error) {
      logger.error(`Accept friend request error: ${error.message}`);
      throw error;
    }
  }

  // ADDITIONAL HELPER METHODS

  static async getPendingRequests(userId) {
    try {
      return await Friend.find({
        friend: userId,
        status: FRIEND_STATUS.PENDING
      }).populate('user', 'username avatar email');
    } catch (error) {
      logger.error(`Get pending requests error: ${error.message}`);
      throw error;
    }
  }

  static async rejectFriendRequest(requestId, userId) {
    try {
      const request = await Friend.findById(requestId);

      if (!request) {
        throw new AppError('Friend request not found', HTTP_STATUS.NOT_FOUND);
      }

      if (!request.friend._id.equals(userId)) {
        throw new AppError('Not authorized to reject this request', HTTP_STATUS.FORBIDDEN);
      }

      request.status = FRIEND_STATUS.REJECTED;
      await request.save();

      return request;
    } catch (error) {
      logger.error(`Reject friend request error: ${error.message}`);
      throw error;
    }
  }

  static async removeFriend(userId, friendId) {
    try {
      // Remove friendship from both sides
      await Friend.deleteMany({
        $or: [
          { user: userId, friend: friendId },
          { user: friendId, friend: userId }
        ]
      });

      // Optionally remove the chat as well
      const chat = await Chat.findOne({
        participants: { $all: [userId, friendId] }
      });

      if (chat) {
        await chat.deleteOne();
      }

      return { success: true };
    } catch (error) {
      logger.error(`Remove friend error: ${error.message}`);
      throw error;
    }
  }
}