import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';

export const generateToken = (payload) => {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    logger.error(`JWT verification failed: ${error.message}`);
    return null;
  }
};
