import { Server as SocketIOServer } from 'socket.io';
import logger from '../utils/logger.js';
import initializeSockets from '../sockets/index.js';

export const createSocketServer = (server) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
  });

  // Initialize all socket handlers
  initializeSockets(io);
  
  return io;
};
