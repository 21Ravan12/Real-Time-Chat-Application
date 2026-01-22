import User from '../../models/user.model.js';
import { generateToken, verifyToken } from '../../config/jwt.config.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import { hashPassword } from '../../utils/hash.js'; // You must have a hashPassword util
import { redisClient } from '../../config/redis.config.js'; // Your Redis client
import { sendCodeEmail } from '../../utils/email.js'; // Your email sending util
import logger from '../../utils/logger.js';
import AppError from '../../utils/appError.js';
import crypto from 'crypto';

export default class AuthService {
  static async register(userData) {
  try {
    const { email, password, username, bio } = userData;

    const existingUser = await User.findOne({ email });
    const existingName = await User.findOne({ username });
    if (existingUser || existingName) {
      throw new AppError(ERROR_MESSAGES.EMAIL_OR_NAME_IN_USE, HTTP_STATUS.CONFLICT);
    }

    const hashedPassword = await hashPassword(password);

    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 dakika

    const redisKey = crypto.createHash('sha256').update(`register:${email}`).digest('hex');

    await redisClient.set(
      redisKey,
      JSON.stringify({
        email,
        password: hashedPassword,
        username,
        bio,
        code: randomCode,
        expiresAt
      }),
      { EX: 15 * 60 } 
    );

    await sendCodeEmail(email, randomCode);

    return { message: "Verification code sent successfully!", redisKey: redisKey };
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    throw error;
  }
  }

static async completeRegistration(Data) {
  try {
    // Validate input
    if (!Data || !Data.redisKey || !Data.verificationCode) {
      throw new AppError('Missing required fields', HTTP_STATUS.BAD_REQUEST);
    }

    let userDataStr;
    try {
      userDataStr = await redisClient.get(Data.redisKey);
    } catch (redisError) {
      logger.error('Redis get operation failed:', redisError);
      throw new AppError(
        'Registration service temporarily unavailable', 
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }

    // Check if data exists
    if (!userDataStr) {
      throw new AppError('No registration data found or code expired.', HTTP_STATUS.BAD_REQUEST);
    }

    // Parse JSON safely
    let userData;
    try {
      userData = JSON.parse(userDataStr);
    } catch (parseError) {
      // Clean up corrupted data
      await redisClient.del(Data.redisKey).catch(() => {});
      throw new AppError('Invalid registration data. Please start again.', HTTP_STATUS.BAD_REQUEST);
    }

    // Validate parsed data structure
    if (!userData || typeof userData !== 'object') {
      await redisClient.del(Data.redisKey).catch(() => {});
      throw new AppError('Invalid registration data format.', HTTP_STATUS.BAD_REQUEST);
    }

    if (String(userData.code) !== String(Data.verificationCode)) {
      // Optional: Add failure count to prevent brute force
      throw new AppError('Invalid verification code.', HTTP_STATUS.BAD_REQUEST);
    }

    if (Date.now() > userData.expiresAt) {
      // Clean up expired data
      await redisClient.del(Data.redisKey).catch(() => {});
      throw new AppError('The verification code has expired.', HTTP_STATUS.BAD_REQUEST);
    }

    let user;
    try {
      user = await User.create({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        bio: userData.bio || '',
      });
    } catch (dbError) {
      logger.error('User creation failed:', dbError);
      
      // Handle specific database errors
      if (dbError.code === 11000) {
        throw new AppError('Email or username already exists.', HTTP_STATUS.CONFLICT);
      }
      
      throw new AppError('Failed to create user account.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    await redisClient.del(Data.redisKey).catch(err => {
      logger.warn('Failed to delete Redis key:', err);
      // Continue even if deletion fails - data will expire anyway
    });

    const token = generateToken({ id: user._id });
    if (!token) {
      throw new AppError('Failed to generate authentication token.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    user.password = undefined;

    return { user, token };
  } catch (error) {
    logger.error(`Complete registration error: ${error.message}`, { 
      stack: error.stack,
      redisKey: Data?.redisKey 
    });
    
    // Re-throw AppError as is, wrap others
    if (error instanceof AppError) {
      throw error;
    }
    
    // Convert unknown errors to AppError
    throw new AppError(
      'Registration failed. Please try again.',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

  static async login(email, password) {
    try {
      const user = await User.findOne({ email }).select('+password');
      
      if (!user || !(await user.comparePassword(password))) {
        return({message: ERROR_MESSAGES.INVALID_CREDENTIALS});
      }

      const token = generateToken({ id: user._id });

      user.password = undefined;

      return { user, token, message: "Login successful!" };
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  static async refreshToken(refreshToken) {
    try {
      const decoded = verifyToken(refreshToken);
      
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new AppError('User not found', HTTP_STATUS.UNAUTHORIZED);
      }

      return generateToken({ id: user._id });
    } catch (error) {
      logger.error(`Token refresh error: ${error.message}`);
      throw new AppError('Invalid refresh token', HTTP_STATUS.UNAUTHORIZED);
    }
  }

  static async sendVerificationCodeForResetPassword(email) {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));

    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 dakika

    const redisKey = crypto
      .createHash('sha256')
      .update(`password-reset:${email}`)
      .digest('hex');

    await redisClient.setEx(
      redisKey,
      15 * 60, 
      JSON.stringify({
        email,
        code: verificationCode,
        expiresAt
      })
    );

    await sendCodeEmail(email, verificationCode);

    return {
      message: "Password recovery code sent successfully!",
      redisKey
    };

  } catch (error) {
    logger.error(`Password reset token error: ${error.stack || error.message}`);
    throw error;
  }
  }

  static async verifyCodeForResetPassword(data) {
  try {
    const { redisKey, verificationCode } = data;

    const resetDataStr = await redisClient.get(redisKey);
    if (!resetDataStr) {
      throw new AppError('No reset data found or code expired.', HTTP_STATUS.BAD_REQUEST);
    }

    const resetData = JSON.parse(resetDataStr);

    if (String(resetData.code) !== String(verificationCode)) {
      throw new AppError('Invalid verification code.', HTTP_STATUS.BAD_REQUEST);
    }

    if (Date.now() > resetData.expiresAt) {
      await redisClient.del(redisKey);
      throw new AppError('The verification code has expired.', HTTP_STATUS.BAD_REQUEST);
    }

    const token = generateToken({ email: resetData.email });
    console.log('Generated reset token:', token);

    return { token };
  } catch (error) {
    logger.error(`Verify code error: ${error.message}`);
    throw error;
  }
  }

  static async resetPassword(token, newPassword) {
  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      throw new AppError('Invalid or expired token.', HTTP_STATUS.UNAUTHORIZED);
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    user.password = await hashPassword(newPassword);

    await user.save();

    return { message: 'Password reset successfully!' };
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    throw error;
  }
}
}