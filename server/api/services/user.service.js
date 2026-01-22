import User from '../../models/user.model.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import AppError from '../../utils/appError.js';
import logger from '../../utils/logger.js';
import fs from 'fs/promises';
import path from "path";

export default class UserService {
  static async getAllUsers(queryParams) {
    try {
      const users = await User.find()
        .sort(queryParams.sort)
        .select('-password -__v');

      return users;
    } catch (error) {
      logger.error(`Get all users error: ${error.message}`);
      throw error;
    }
  }

  static async getUserById(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password -__v')
        .populate('friends', 'username avatar');

      if (!user) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      return user;
    } catch (error) {
      logger.error(`Get user error: ${error.message}`);
      throw error;
    }
  }

static async updateUser(userId, updateData, file) {
  try {
    if (file) {
      const oldUser = await User.findById(userId);

      if (oldUser?.avatar) {
        const oldPath = path.join('public', oldUser.avatar);
        await fs.rm(oldPath).catch(() => {});
      }

      const uploadDir = path.join('public', 'img', String(userId));
      await fs.mkdir(uploadDir, { recursive: true });

      const uploadPath = path.join(uploadDir, file.filename);
      await fs.rename(file.path, uploadPath);

      updateData.avatar = `/img/${String(userId)}/${file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return user;
  } catch (error) {
    logger.error(`Update user error: ${error.message}`);
    throw error;
  }
}

  static async deleteUser(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      
      if (!user) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      if (user.avatar && !user.avatar.includes('default')) {
        const avatarDir = path.join('public/img', String(userId));
        await fs.rm(avatarDir, { recursive: true, force: true }).catch(err => logger.error(err));
      }

      return { message: 'User deleted successfully' };
    } catch (error) {
      logger.error(`Delete user error: ${error.message}`);
      throw error;
    }
  }

  static async updateOnlineStatus(userId, isOnline) {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { lastSeen: isOnline ? null : new Date() },
        { new: true }
      );
    } catch (error) {
      logger.error(`Update online status error: ${error.message}`);
      throw error;
    }
  }
}