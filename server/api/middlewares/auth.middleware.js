import jwt from 'jsonwebtoken';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import { generateToken, verifyToken } from '../../config/jwt.config.js';
import { error } from '../../utils/response.js';
import User from '../../models/user.model.js';
import logger from '../../utils/logger.js';

// JWT Authentication Middleware
export const authenticate = async (req, res, next) => {
  try {
    // 1) Get token from headers or cookies
    let token;
    
    // a) Check cookies if header doesn't have token
    if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    // b) Check authorization header first
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } 

    if (!token) {
      return error(
        res,
        ERROR_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // 2) Verify token
    const decoded = verifyToken(token);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return error(
        res,
        'The user belonging to this token no longer exists',
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // 4) Check if user changed password after token was issued
    //if (currentUser.changedPasswordAfter(decoded.iat)) {
    //  return error(
    //    res,
    //    'User recently changed password. Please log in again',
    //    HTTP_STATUS.UNAUTHORIZED
    //  );
    //}

    // 5) Grant access and attach user to request
    req.user = currentUser;
    
    // Optionally attach user to res.locals for views if needed
    res.locals.user = currentUser;
    
    next();
  } catch (err) {
    logger.error(`Authentication error: ${err.message}`);
    
    // Clear invalid token cookie if exists
    if (req.cookies?.jwt) {
      res.clearCookie('jwt');
    }
    
    error(
      res,
      ERROR_MESSAGES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED
    );
  }
};

// Role-based Authorization Middleware
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return error(
        res,
        'You do not have permission to perform this action',
        HTTP_STATUS.FORBIDDEN
      );
    }
    next();
  };
};

// Socket.io Authentication Middleware
export const verifySocketToken = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { _id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    logger.error(`Socket auth error: ${err.message}`);
    next(new Error('Authentication error: Invalid token'));
  }
};