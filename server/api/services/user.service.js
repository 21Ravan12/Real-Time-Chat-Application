import User from '../../models/user.model.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import AppError from '../../utils/appError.js';
import logger from '../../utils/logger.js';
import fs from 'fs/promises';
import path from "path";
import { uploadToCloudinary, deleteFromCloudinary } from '../../utils/cloudinary.js';

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

static async updateUser(userId, updateData, fileBuffer, fileName, mimetype) {
  try {
    console.log('👤 User update with file:', { userId, hasFile: !!fileBuffer });
    
    // If new avatar file is provided
    if (fileBuffer && fileName && mimetype) {
      const oldUser = await User.findById(userId);
      
      // Delete old avatar from Cloudinary if exists
      if (oldUser?.avatar && oldUser.avatar.includes('cloudinary')) {
        try {
          // Extract public_id from Cloudinary URL
          const urlParts = oldUser.avatar.split('/');
          const publicIdWithExtension = urlParts[urlParts.length - 1];
          const publicId = publicIdWithExtension.split('.')[0];
          
          if (publicId && !publicId.includes('default-avatar')) {
            await deleteFromCloudinary(`realtalk-avatars/${publicId}`);
            console.log('🗑️ Deleted old avatar from Cloudinary');
          }
        } catch (deleteError) {
          console.warn('⚠️ Could not delete old avatar:', deleteError.message);
        }
      }
      
      // Upload new avatar to Cloudinary
      try {
        console.log('📤 Uploading new avatar to Cloudinary...');
        const cloudinaryResult = await uploadToCloudinary(fileBuffer, {
          folder: 'realtalk-avatars',
          public_id: `avatar-${userId}-${Date.now()}`,
          resource_type: 'image',
          transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'face' }, // Square crop
            { radius: 'max' }, // Circle avatar
            { quality: 'auto:good' }
          ]
        });
        
        updateData.avatar = cloudinaryResult.secure_url;
        console.log('✅ Avatar uploaded to Cloudinary:', cloudinaryResult.secure_url);
        
      } catch (uploadError) {
        console.error('❌ Cloudinary upload failed, using default:', uploadError.message);
        // Fallback to default avatar
        updateData.avatar = '/img/default-avatar.png';
      }
    }
    
    // Update user in database
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -refreshToken -__v');
    
    if (!user) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    
    console.log('✅ User updated successfully:', user.email);
    return user;
    
  } catch (error) {
    logger.error(`Update user error: ${error.message}`, { userId });
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
