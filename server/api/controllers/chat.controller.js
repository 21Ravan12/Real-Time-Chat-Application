import ChatService from '../services/chat.service.js';
import { success } from '../../utils/response.js';
import logger from '../../utils/logger.js';

export default class ChatController {
  static async getAllChats(req, res, next) {
    try {
      const chats = await ChatService.getAllChats(req.user._id);
      console.log(1);
      console.log('All chats fetched for user:', { chats });
      success(res, chats);
    } catch (error) {
      logger.error(`Get all chats failed: ${error.message}`);
      next(error);
    }
  }

  static async getChat(req, res, next) {
    try {
      const chat = await ChatService.getChatByParticipants(req.params.id, req.user._id);
      success(res, chat);
    } catch (error) {
      logger.error(`Get chat failed: ${error.message}`);
      next(error);
    }
  }

  static async getGroupChat(req, res, next) {
    try {
      console.log('Getting group chat for group ID:', req.params.id, 'and user ID:', req.user._id);
      const chat = await ChatService.getChatByGroupId(req.params.id, req.user._id);
      success(res, chat);
    } catch (error) {
      logger.error(`Get chat failed: ${error.message}`);
      next(error);
    }
  }

  static async sendMessage(req, res, next) {
    try {
      let message;
      
      if (req.body.recipient) {
        message = await ChatService.sendPrivateMessage(
          req.user._id,
          req.body.recipient,
          req.body.content,
          req.body.messageType,
          req.body.attachments
        );
      } else if (req.body.group) {
        message = await ChatService.sendGroupMessage(
          req.user._id,
          req.body.group,
          req.body.content,
          req.body.messageType,
          req.body.attachments
        );
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either recipient or group must be specified'
        });
      }

      success(res, message, 201);
    } catch (error) {
      logger.error(`Send message failed: ${error.message}`);
      next(error);
    }
  }

  static async getUserChat(req, res, next) {
    try {
      const messages = await ChatService.getMessages(req.user._id, {
        recipient: req.params.id,
        limit: req.query.limit,
        before: req.query.before
      });
      success(res, messages);
    } catch (error) {
      logger.error(`Get user chat failed: ${error.message}`);
      next(error);
    }
  }

  static async getGroupChat(req, res, next) {
    try {
      const messages = await ChatService.getChatByGroupId(req.params.id, req.user._id);
      success(res, messages);
    } catch (error) {
      logger.error(`Get group chat failed: ${error.message}`);
      next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      console.log('Mark as read request body:', req.body);
      const updatedCount = await ChatService.markMessagesAsRead(
        req.body.id,
        req.body.type, 
        req.user.id
      );

      logger.info(`Marked ${updatedCount} messages as read in chat ${req.params.id} for user ${req.user.id}`);
      success(res, null, 204);
    } catch (error) {
      logger.error(`Mark as read failed: ${error.message}`);
      next(error);
    }
  }
}