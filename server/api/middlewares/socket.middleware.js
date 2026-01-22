import { Server } from 'socket.io';
import logger from '../../utils/logger.js';
import * as socketAuth from '../middlewares/socket.middleware.js';

/**
 * Initialize Socket.IO server with authentication middleware
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Apply authentication middleware
  io.use(socketAuth.verifySocketToken);

  io.on('connection', (socket) => {
    logger.info(`New socket connection: ${socket.id}`);
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} - Reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error: ${socket.id} - ${error.message}`);
    });
  });

  return io;
};