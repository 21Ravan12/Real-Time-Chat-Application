import jwt from 'jsonwebtoken';
import User from '../../models/user.model.js';
import logger from '../../utils/logger.js';

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      logger.warn('Socket connection attempt without token');
      return next(new Error('Authentication error: Token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      logger.warn(`Socket auth failed: User not found for ID ${decoded.id}`);
      return next(new Error('Authentication error: User not found'));
    }

    // Kullanıcı bilgilerini socket'e ekle
    socket.user = user;
    logger.info(`Socket authenticated for user: ${user._id} (${user.username})`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    
    next(new Error('Authentication error'));
  }
};

export default socketAuthMiddleware;