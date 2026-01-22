import Message from '../models/message.model.js';
import Chat from '../models/chat.model.js';
import mongoose from 'mongoose';
import { MESSAGE_TYPES } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';

// Global online users tracker
const onlineUsers = new Map(); // userId -> Set(socketIds)

// Typing indicators tracker - improved structure
const typingUsers = new Map(); // chatId -> Map(userId -> timeout)

export default function chatSocket(io, socket) {
  // ==================== ONLINE STATUS TRACKING ====================
  
  // Initialize online status when socket connects
  const initializeOnlineStatus = () => {
    try {
      const userId = socket.user._id.toString();
      console.log('Initializing online status for user:', userId);
      
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);
      
      // Join user room for private messages (redundant but safe)
      socket.join(`user_${userId}`);
      
      // Broadcast online status to relevant users
      socket.broadcast.emit('chat:user_status_changed', { 
        userId, 
        isOnline: true 
      });
      
      // Track active users
      metrics.activeUsersNow.set(onlineUsers.size);
      metrics.userSessions.inc();
      
      logger.info(`User ${userId} is now online (${onlineUsers.get(userId).size} connections)`);
      
      // Confirm to the client that they're online
      socket.emit('user:online_confirmed', { userId, isOnline: true });
    } catch (error) {
      logger.error(`User online tracking error: ${error.message}`);
    }
  };

  // Call initialization immediately when socket connects
  initializeOnlineStatus();

  // Also keep the event handler for manual triggers
  socket.on('user:online', () => {
    console.log('Manual user:online event received');
    initializeOnlineStatus();
  });

  // Improved online status check
  socket.on('chat:is_online', (data) => {
    try {
      console.log('Received chat:is_online event with data:', data);
      const { userId } = data;
      
      if (!userId) {
        return socket.emit('chat:error', { message: 'User ID is required' });
      }
      
      // Check both room presence and our tracking map
      const hasConnections = onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
      const isOnline = hasConnections;
      
      console.log(`User ${userId} online status: ${isOnline}, connections: ${onlineUsers.get(userId)?.size || 0}`);
      
      socket.emit('chat:user_online_status', { 
        userId, 
        isOnline,
        connections: onlineUsers.get(userId)?.size || 0,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error(`Online status check error: ${error.message}`);
      socket.emit('chat:error', { message: 'Failed to check online status' });
    }
  });

  // Handle disconnect for online status
  socket.on('disconnect', (reason) => {
    try {
      const userId = socket.user?._id?.toString();
      if (!userId) return;
      
      console.log(`User ${userId} disconnecting, reason: ${reason}`);
      
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        
        // If no more connections, remove user and broadcast offline status
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);
          
          // Update active users metric
          metrics.activeUsersNow.set(onlineUsers.size);
          
          // Broadcast offline status after a short delay
          setTimeout(() => {
            if (!onlineUsers.has(userId)) {
              socket.broadcast.emit('chat:user_status_changed', { 
                userId, 
                isOnline: false,
                lastSeen: new Date()
              });
              logger.info(`User ${userId} is now offline`);
            }
          }, 3000); // 3 second delay
        } else {
          logger.info(`User ${userId} has ${onlineUsers.get(userId).size} remaining connections`);
        }
      }
    } catch (error) {
      logger.error(`Disconnect handling error: ${error.message}`);
    }
  });

  // ==================== EXISTING CHAT FUNCTIONALITY ====================
  
  socket.on('chat:send_private', async (data) => {
  try {
    const { recipient, content, messageType = MESSAGE_TYPES.TEXT, attachments } = data;
    const startTime = Date.now();
    
    // Alıcı ID kontrolü
    if (!recipient || !mongoose.Types.ObjectId.isValid(recipient)) {
      metrics.errorCounter.labels('socket_error', 'send_private').inc();
      return socket.emit('chat:error', { message: 'Geçersiz alıcı ID' });
    }

    const findPrivateChat = async (userId, recipientId) => {
        try {
          const chat = await Chat.findOne({
            type: 'private',
            participants: { 
              $all: [
                new mongoose.Types.ObjectId(userId),
                new mongoose.Types.ObjectId(recipientId)
              ],
              $size: 2
            },
            isActive: true
          });
      
          return chat ? chat._id : null;
        } catch (error) {
          console.error('Error finding chat:', error);
          return null;
        }
    };

    // Private chat oluştur veya bul
    let chatId = await findPrivateChat(socket.user._id, recipient);
    
    if (!chatId) {
      // Yeni private chat oluştur
      const newChat = await Chat.create({
        type: 'private',
        participants: [socket.user._id, recipient],
        isActive: true
      });
      chatId = newChat._id;
    }

    const message = await Message.create({
      chat: chatId,
      sender: socket.user._id,
      recipient,
      content,
      messageType,
      attachments
    });

    // Populate edilmiş mesajı gönder
    const populatedMessage = await Message.findById(message._id)

    // Hem gönderene hem de alıcıya gönder
    io.to(`user_${recipient}`).emit('chat:receive_private', populatedMessage);
    socket.emit('chat:receive_private', populatedMessage); // Gönderene de bildirim

    // Track message metrics
    metrics.messagesSent.inc({ type: 'private', platform: 'web' });
    if (content) {
      metrics.avgMessageLength.observe(content.length);
    }
    
    // Track active chat rooms
    metrics.activeChatRooms.set({ type: 'private' }, onlineUsers.size);

    const duration = Date.now() - startTime;
    logger.info(`Private message sent from ${socket.user._id} to ${recipient} in ${duration}ms`);
  } catch (error) {
    metrics.errorCounter.labels('socket_error', 'send_private').inc();
    logger.error(`Chat socket error: ${error.message}`);
    socket.emit('chat:error', { message: 'Failed to send message' });
  }
  });

  socket.on('chat:send_group', async (data) => {
    try {
      const { groupId, content, messageType = MESSAGE_TYPES.TEXT, attachments } = data;
      const startTime = Date.now();

      const findGroupChat = async (groupId) => {
        try {
          const chat = await Chat.findOne({
            groupId: groupId,
            type: 'group',
            isActive: true
          });
          return chat ? chat._id : null;
        }
        catch (error) {
          console.error('Error finding group chat:', error);
          return null;
        }
      };

      const validGroupId = await findGroupChat(groupId);

      const message = await Message.create({
        chat: validGroupId,
        sender: socket.user._id,
        content,
        messageType,
        attachments
      });

      message.chat = groupId; // Add groupId for client-side use
      // Broadcast to group participants
      io.to(`group_${groupId}`).emit('chat:receive_group', message);
      // Send back to sender for confirmation
      socket.emit('chat:message_sent', message);

      // Track group message metrics
      metrics.messagesSent.inc({ type: 'group', platform: 'web' });
      if (content) {
        metrics.avgMessageLength.observe(content.length);
      }

      const duration = Date.now() - startTime;
      logger.info(`Group message sent in group ${groupId} by ${socket.user._id} in ${duration}ms`);
    } catch (error) {
      metrics.errorCounter.labels('socket_error', 'send_group').inc();
      logger.error(`Chat socket error: ${error.message}`);
      socket.emit('chat:error', { message: 'Failed to send group message' });
    }
  });

  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
    logger.info(`User ${socket.user._id} joined group_${groupId}`);
  });

  socket.on('chat:mark_read', async (data) => {
    try {
      logger.info(`Marking message as read: ${data.messageId} by user ${socket.user._id}`);
      const startTime = Date.now();
      
      // Find the message to get chat information
      const message = await Message.findById(data.messageId);
      
      if (!message) {
        logger.error(`Message not found: ${data.messageId}`);
        metrics.errorCounter.labels('socket_error', 'mark_read').inc();
        return;
      }

      // Update read status for this specific message
      const updatedMessage = await Message.findByIdAndUpdate(
        data.messageId,
        { 
          $addToSet: { 
            readedBy: { 
              user: socket.user._id, 
              readAt: new Date() 
            } 
          } 
        },
        { new: true }
      );

      if (updatedMessage) {
        // Notify the sender that their message was read
        io.to(`user_${message.sender}`).emit('chat:message_read', {
          messageId: updatedMessage._id,
          readBy: socket.user._id,
          readAt: updatedMessage.readedBy.find(r => r.user.toString() === socket.user._id)?.readAt
        });
        
        const duration = Date.now() - startTime;
        logger.info(`Message read marked in ${duration}ms`);
      }
    } catch (error) {
      metrics.errorCounter.labels('socket_error', 'mark_read').inc();
      logger.error(`Read receipt error: ${error.message}`);
    }
  });

  // ==================== TYPING INDICATORS ====================

  // Start typing indicator with debouncing
  socket.on('chat:typing_start', async (data) => {
    try {
      const { chatId, chatType = 'private', recipient } = data;
      const startTime = Date.now();

      if (chatType === 'group' && !chatId) {
        metrics.errorCounter.labels('socket_error', 'typing_start').inc();
        return socket.emit('chat:error', { message: 'Chat ID is required for group chats' });
      }

      if (chatType === 'private' && !recipient) {
        metrics.errorCounter.labels('socket_error', 'typing_start').inc();
        return socket.emit('chat:error', { message: 'Chat ID or recipient is required for private chats' });
      }

      let targetChatId = chatId;

      // If no chatId provided but recipient exists, find/create private chat
      if (!targetChatId && recipient) {
        targetChatId = await findPrivateChat(socket.user._id, recipient);
      }

      if (!targetChatId) {
        metrics.errorCounter.labels('socket_error', 'typing_start').inc();
        return socket.emit('chat:error', { message: 'Could not find or create chat' });
      }

      // Initialize typing tracker for this chat if not exists
      if (!typingUsers.has(targetChatId)) {
        typingUsers.set(targetChatId, new Map());
      }

      const chatTypingUsers = typingUsers.get(targetChatId);
      const userId = socket.user._id.toString();

      // Clear existing timeout if user was already typing
      if (chatTypingUsers.has(userId)) {
        clearTimeout(chatTypingUsers.get(userId));
      }

      // Set new timeout to automatically stop typing after 3 seconds
      const timeoutId = setTimeout(() => {
        handleStopTyping(targetChatId, userId, chatType, recipient);
      }, 3000);

      chatTypingUsers.set(userId, timeoutId);

      // Get user info for typing indicator
      const typingUserInfo = {
        userId: socket.user._id,
        userName: socket.user.name || socket.user.username,
        avatar: socket.user.avatar,
        startedAt: new Date()
      };

      // Broadcast typing indicator to all participants in the chat
      broadcastTypingIndicator(io, targetChatId, chatType, {
        chatId: targetChatId,
        recipient: recipient,
        user: typingUserInfo,
        chatType: chatType,
        isTyping: true
      });

      const duration = Date.now() - startTime;
      logger.debug(`User ${userId} started typing in chat ${targetChatId} (${duration}ms)`);

    } catch (error) {
      metrics.errorCounter.labels('socket_error', 'typing_start').inc();
      logger.error(`Typing start error: ${error.message}`);
      socket.emit('chat:error', { message: 'Failed to start typing indicator' });
    }
  });

  // Stop typing indicator
  socket.on('chat:typing_stop', (data) => {
    try {
      const { chatId, chatType = 'private', recipient } = data;
      const startTime = Date.now();
      
      if (chatType === 'group' && !chatId) {
        metrics.errorCounter.labels('socket_error', 'typing_stop').inc();
        return socket.emit('chat:error', { message: 'Chat ID is required for group chats' });
      }

      if (chatType === 'private' && !recipient) {
        metrics.errorCounter.labels('socket_error', 'typing_stop').inc();
        return socket.emit('chat:error', { message: 'Chat ID or recipient is required for private chats' });
      }

      const userId = socket.user._id.toString();
      handleStopTyping(chatId, userId, chatType, recipient);

      const duration = Date.now() - startTime;
      logger.debug(`User ${userId} stopped typing in chat ${chatId} (${duration}ms)`);

    } catch (error) {
      metrics.errorCounter.labels('socket_error', 'typing_stop').inc();
      logger.error(`Typing stop error: ${error.message}`);
      socket.emit('chat:error', { message: 'Failed to stop typing indicator' });
    }
  });

  // Get current typing users in a chat
  socket.on('chat:get_typing_users', (data) => {
    try {
      const { chatId } = data;
      const startTime = Date.now();
      
      if (!chatId) {
        metrics.errorCounter.labels('socket_error', 'get_typing_users').inc();
        return socket.emit('chat:error', { message: 'Chat ID is required' });
      }

      const currentTypingUsers = getCurrentTypingUsers(chatId);
      socket.emit('chat:typing_users_list', {
        chatId,
        typingUsers: currentTypingUsers
      });

      const duration = Date.now() - startTime;
      logger.debug(`Retrieved typing users in ${duration}ms`);

    } catch (error) {
      metrics.errorCounter.labels('socket_error', 'get_typing_users').inc();
      logger.error(`Get typing users error: ${error.message}`);
      socket.emit('chat:error', { message: 'Failed to get typing users' });
    }
  });

  // ==================== TYPING HELPER FUNCTIONS ====================

  // Helper function to handle stopping typing
  const handleStopTyping = (chatId, userId, chatType, recipient) => {
    if (typingUsers.has(chatId)) {
      const chatTypingUsers = typingUsers.get(chatId);
      
      // Clear timeout
      if (chatTypingUsers.has(userId)) {
        clearTimeout(chatTypingUsers.get(userId));
        chatTypingUsers.delete(userId);
      }

      // If no one is typing in this chat anymore, clean up
      if (chatTypingUsers.size === 0) {
        typingUsers.delete(chatId);
      }
      // Broadcast that user stopped typing
      broadcastTypingIndicator(io, chatId, chatType, {
        chatId,
        user: { userId },
        chatType: chatType,
        recipient: recipient,
        isTyping: false
      });
    }
  };

  // Helper function to broadcast typing indicators
  const broadcastTypingIndicator = (io, chatId, chatType, data) => {
  try {
    const room = chatType === 'group' ? `group_${chatId}` : `user_${data.recipient}`;
    
    // Exclude the sender from receiving their own typing indicator
    const senderId = data.senderId || data.userId;
    if (senderId) {
      socket.broadcast.to(room).emit('chat:typing_indicator', data);
    } else {
      io.to(room).emit('chat:typing_indicator', data);
    }

    // Track typing events
    metrics.messagesPerMinute.inc();

    logger.info(`Typing indicator broadcast to ${room} from ${senderId}`);
  } catch (error) {
    metrics.errorCounter.labels('socket_error', 'typing_broadcast').inc();
    logger.error(`Typing indicator broadcast error: ${error.message}`);
  }
  };

  // Helper function to get current typing users in a chat
  const getCurrentTypingUsers = (chatId) => {
    if (!typingUsers.has(chatId)) {
      return [];
    }

    const typingUserMap = typingUsers.get(chatId);
    const typingUsersList = [];

    // Here you would typically fetch user details from database
    // For now, we'll just return the user IDs
    for (const userId of typingUserMap.keys()) {
      typingUsersList.push({
        userId,
        // In a real implementation, you'd fetch user details here
        startedAt: new Date() // This would be stored when typing started
      });
    }

    return typingUsersList;
  };

  // Helper function to find private chat
  const findPrivateChat = async (userId, recipientId) => {
    try {
      const chat = await Chat.findOne({
        type: 'private',
        participants: { 
          $all: [
            new mongoose.Types.ObjectId(userId),
            new mongoose.Types.ObjectId(recipientId)
          ],
          $size: 2
        },
        isActive: true
      });

      console.log('Found chat:', chat._id);

      if (chat) return chat._id;
    } catch (error) {
      logger.error(`Find/create chat error: ${error.message}`);
      return null;
    }
  };
}