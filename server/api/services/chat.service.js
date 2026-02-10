import Chat from '../../models/chat.model.js';
import Group from '../../models/group.model.js';
import Friend from '../../models/friend.model.js';
import Message from '../../models/message.model.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import AppError from '../../utils/appError.js';
import logger from '../../utils/logger.js';
import mongoose from 'mongoose';

export default class ChatService {
  /**
   * Get all chats for a user (both private and group chats)
   */
  static async getAllChats(userId) {
  try {
    // Get private chats where user is either sender or recipient
    const privateChats = await Chat.find({
      $or: [{ participants: userId }]
    })
      .populate('participants', 'name email avatar')
      .sort({ updatedAt: -1 });

    // Get group chats where user is a member
    const groupChats = await Group.find({ members: userId })
      .sort({ updatedAt: -1 });

    // Get unread counts for all chats in parallel
    const privateChatsWithUnread = await Promise.all(
      privateChats.map(async (chat) => {
        const unreadCount = await this.getUnreadCount(chat._id, userId);
        return {
          _id: chat._id,
          type: 'private',
          participants: chat.participants.filter(p => p._id.toString() !== userId.toString()),
          unreadCount: unreadCount || 0,
          updatedAt: chat.updatedAt
        };
      })
    );

    const groupChatsWithUnread = await Promise.all(
      groupChats.map(async (group) => {
        const unreadCount = await this.getUnreadCount(group.chat, userId);
        return {
          _id: group._id,
          type: 'group',
          name: group.name,
          avatar: group.avatar,
          unreadCount: unreadCount || 0,
          updatedAt: group.updatedAt
        };
      })
    );

    // Combine and sort results
    const allChats = [
      ...privateChatsWithUnread,
      ...groupChatsWithUnread
    ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    console.log('All chats fetched for user:', userId, { allChats });

    return allChats;
  } catch (error) {
    logger.error(`Get all chats service error: ${error.message}`);
    throw new AppError(ERROR_MESSAGES.CHAT_FETCH_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  }

  static async getUnreadCount(chatId, userId) {
  try {
    // Count messages in this chat that haven't been read by the user
    const unreadCount = await Message.countDocuments({
      chat: chatId,
      'readedBy.user': { $ne: new mongoose.Types.ObjectId(userId) },
    });

    return unreadCount;
  } catch (error) {
    logger.error(`Get unread count service error: ${error.message}`);
    return 0; // Hata durumunda 0 dönerek diğer chat'leri etkilememesini sağla
  }
  }

  static async markMessagesAsRead(id, type, userId) {
    try {
      console.log('Marking messages as read:', { id, type, userId });
      if (type === 'private') {
        const chat = await Friend.findOne({ user: userId, friend: id });
        if (!chat) {
          throw new AppError(ERROR_MESSAGES.CHAT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }

        // Update all messages in this chat that the user hasn't read yet
        const result = await Message.updateMany(
          {
            chat: chat.chat,
            'readedBy.user': { $ne: new mongoose.Types.ObjectId(userId) },
          },
          {
            $push: { readedBy: { user: userId, readAt: new Date() } },
          }
        );
        console.log('Mark as read result:', result);
        return result; // Kaç mesajın güncellendiğini döndürüyor
      } else if (type === 'group') {
        const group = await Group.findById(new mongoose.Types.ObjectId(id));

        console.log('Group found for marking as read:                                                                                                                                                                                                                               ', group);
        const result = await Message.updateMany(
          {
            chat: group.chat,
            'readedBy.user': { $ne: new mongoose.Types.ObjectId(userId) },
          },
          {
            $push: { readedBy: { user: userId, readAt: new Date() } },
          }
        );
        console.log('Mark as read result for group:', result);
        return result; // Kaç mesajın güncellendiğini döndürüyor
      } else {
        throw new AppError('Invalid chat type', HTTP_STATUS.BAD_REQUEST);
      }
    } catch (error) {
      throw new Error(`Mark messages as read error: ${error.message}`);
    }
  }

  /**
   * Get chat by ID with authorization check
   */
  static async getChatByParticipants(friendId, yourId) {
  try {
    const chat = await Chat.findOne({
      participants: { $all: [friendId, yourId] } // her iki ID de katılımcılar arasında olmalı
    })
      .populate('participants', 'name email avatar')
      .populate({
        path: 'messages',
        options: { sort: { createdAt: 1 } }
      });

    if (!chat) {
      throw new AppError(ERROR_MESSAGES.CHAT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return chat;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`Get chat by participants service error: ${error.message}`);
    throw new AppError(ERROR_MESSAGES.CHAT_FETCH_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  }
static async markMessagesAsRead(id, type, userId) {
  try {
    console.log('Marking messages as read:', { id, type, userId });
    
    if (type === 'private') {
      const friend = await Friend.findOne({ user: userId, friend: id });
      if (!friend) {
        throw new AppError(ERROR_MESSAGES.CHAT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      if (!friend.chat) {
        throw new AppError(ERROR_MESSAGES.CHAT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      // Update all messages in this chat that the user hasn't read yet
      const result = await Message.updateMany(
        {
          chat: friend.chat,
          'readedBy.user': { $ne: new mongoose.Types.ObjectId(userId) },
        },
        {
          $push: { readedBy: { user: userId, readAt: new Date() } },
        }
      );
      
      console.log('Mark as read result:', result);
      return result;
      
    } else if (type === 'group') {
      const group = await Group.findById(new mongoose.Types.ObjectId(id));

      if (!group) {
        throw new AppError(ERROR_MESSAGES.GROUP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      if (!group.chat) {
        throw new AppError(ERROR_MESSAGES.GROUP_CHAT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      console.log('Group found for marking as read:', group);
      
      const result = await Message.updateMany(
        {
          chat: group.chat,
          'readedBy.user': { $ne: new mongoose.Types.ObjectId(userId) },
        },
        {
          $push: { readedBy: { user: userId, readAt: new Date() } },
        }
      );
      
      console.log('Mark as read result for group:', result);
      return result;
      
    } else {
      throw new AppError('Invalid chat type', HTTP_STATUS.BAD_REQUEST);
    }
  } catch (error) {
    // Pass through AppError instances, wrap others
    if (error instanceof AppError) {
      throw error;
    }
    throw new Error(`Mark messages as read error: ${error.message}`);
  }
}

static async getChatByGroupId(groupId, userId) {
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new AppError(
        ERROR_MESSAGES.GROUP_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND
      );
    }

    const userIdStr = userId.toString();

    const isMember = group.members.some(member =>
      member.user && member.user.toString() === userIdStr
    );

    if (!isMember) {
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED_GROUP_ACCESS,
        HTTP_STATUS.FORBIDDEN
      );
    }

    // 3️⃣ Chat fetch
    const groupChat = await Chat.findOne({
      groupId: groupId,
      type: 'group'
    })
      .populate('participants', 'name email avatar')
      .populate({
        path: 'messages',
        options: { sort: { createdAt: 1 } },
        populate: {
          path: 'sender',
          select: 'name email avatar'
        }
      });

    if (!groupChat) {
      throw new AppError(
        ERROR_MESSAGES.GROUP_CHAT_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND
      );
    }

    return groupChat;

  } catch (error) {
    if (error instanceof AppError) throw error;

    logger.error(
      `Get chat by group ID service error: ${error.message}`
    );

    throw new AppError(
      ERROR_MESSAGES.GROUP_CHAT_FETCH_FAILED,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
}
