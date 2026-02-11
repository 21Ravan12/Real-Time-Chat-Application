import UserService from '../services/user.service.js';
import { success } from '../../utils/response.js';
import logger from '../../utils/logger.js';
import upload from '../../config/multer.config.js';

export default class UserController {
  static async getAllUsers(req, res, next) {
    try {
      const users = await UserService.getAllUsers(req.query);
      success(res, users);
    } catch (error) {
      logger.error(`Get all users failed: ${error.message}`);
      next(error);
    }
  }

  static async getMe(req, res, next) {
    try {
      const user = await UserService.getUserById(req.user.id);
      success(res, user);
    } catch (error) {
      logger.error(`Get user profile failed: ${error.message}`);
      next(error);
    }
  }

  static async getUser(req, res, next) {
    try {
      const user = await UserService.getUserById(req.params.id);
      success(res, user);
    } catch (error) {
      logger.error(`Get user failed: ${error.message}`);
      next(error);
    }
  }

static async updateUser(req, res, next) {
  try {
    logger.info('Request body:', req.body);
    
    // Extract file info from req.file (if exists)
    let fileBuffer = null;
    let fileName = null;
    let mimetype = null;
    
    if (req.file) {
      fileBuffer = req.file.buffer;      // File buffer
      fileName = req.file.originalname;  // Original filename
      mimetype = req.file.mimetype;      // MIME type
      
      console.log('📁 File upload detected:', {
        filename: fileName,
        mimetype: mimetype,
        size: req.file.size
      });
    }
    
    // Call service with correct parameters
    const updatedUser = await UserService.updateUser(
      req.user._id,
      req.body,
      fileBuffer,    // Buffer
      fileName,      // Filename
      mimetype       // MIME type
    );
    
    res.json({ 
      status: 'success', 
      data: updatedUser,
      message: req.file ? 'Profile and avatar updated' : 'Profile updated'
    });
  } catch (error) {
    logger.error(`Update profile failed: ${error.message}`);
    next(error);
  }
}

static async deleteUser(req, res, next) {
    try {
      await UserService.deleteUser(req.user._id);
      
      // Çıkış yap
      res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
      });
      
      success(res, null, 'User deleted successfully', 204);
    } catch (error) {
      logger.error(`Delete account failed: ${error.message}`);
      next(error);
    }
  }

  static async deleteUserById(req, res, next) {
    try {
      await UserService.deleteUser(req.params.id);
      success(res, null, 'User deleted successfully', 204);
    } catch (error) {
      logger.error(`Delete user failed: ${error.message}`);
      next(error);
    }
  }
}
