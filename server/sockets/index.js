import chatSocket from './chat.socket.js';
import socketAuthMiddleware from '../api/middlewares/socketAuth.js';
import logger from '../utils/logger.js';

export default function initializeSockets(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info(`New socket connection: ${socket.id}`);

    // Join user's personal room
    if (socket.user?._id) {
      socket.join(`user_${socket.user._id}`);
      logger.info(`User ${socket.user._id} joined personal room`);
    }

    // Initialize all socket handlers
    chatSocket(io, socket);

  });

  logger.info('Socket handlers initialized');
}