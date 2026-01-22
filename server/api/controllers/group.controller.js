import GroupService from '../services/group.service.js';
import { success } from '../../utils/response.js';
import AppError from '../../utils/appError.js';
import logger from '../../utils/logger.js';

export default class GroupController {
  static async getUserGroups(req, res, next) {
    try {
      const groups = await GroupService.getUserGroups(req.user._id);
      success(res, groups);
    } catch (error) {
      logger.error(`Get user groups failed: ${error.message}`);
      next(error);
    }
  }

static async createGroup(req, res, next) {
  try {
    const group = await GroupService.createGroup(
      req.user._id,
      req.body
    );
    
    const message = 'Group created successfully!';
    
    // FIX: Return 201 with the correct structure
    return res.status(201).json({
      success: true,
      message,
      data: group
    });
    
  } catch (error) {
    logger.error(`Create group failed: ${error.message}`);
    
    // FIX: Handle AppError properly
    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
}

  static async getGroup(req, res, next) {
    try {
      const group = await GroupService.getGroupDetails(
        req.params.id,
        req.user._id
      );
      success(res, group);
    } catch (error) {
      logger.error(`Get group failed: ${error.message}`);
      next(error);
    }
  }

  static async updateGroup(req, res, next) {
    try {
      const group = await GroupService.updateGroup(
        req.params.id,
        req.user._id,
        req.body
      );
      success(res, group);
    } catch (error) {
      logger.error(`Update group failed: ${error.message}`);
      next(error);
    }
  }

  static async addGroupMember(req, res, next) {
    try {
      const group = await GroupService.addMember(
        req.params.id,
        req.body.email,
        req.body.role,
        req.user._id
      );
      success(res, group);
    } catch (error) {
      logger.error(`Add group member failed: ${error.message}`);
      next(error);
    }
  }

  static async removeGroupMember(req, res, next) {
    try {
      const group = await GroupService.removeMember(
        req.params.id,
        req.body.userId,
        req.user._id
      );
      success(res, group);
    } catch (error) {
      logger.error(`Remove group member failed: ${error.message}`);
      next(error);
    }
  }
static async removeMember(req, res, next) {
  try {
    const { id: groupId } = req.params;
    const { memberId } = req.params;
    
    // DEBUG: Check what's in req.user
    console.log('CONTROLLER DEBUG - Full req.user:', req.user);
    console.log('CONTROLLER DEBUG - req.user._id:', req.user._id);
    console.log('CONTROLLER DEBUG - req.user._id type:', typeof req.user._id);
    console.log('CONTROLLER DEBUG - req.user._id.toString():', req.user._id?.toString());
    console.log('CONTROLLER DEBUG - req.user.id:', req.user.id);
    
    // Extract user ID - Mongoose documents have both _id (ObjectId) and id (string)
    const userId = req.user._id; // This should be an ObjectId
    
    console.log('CONTROLLER DEBUG - userId to pass:', userId);
    console.log('CONTROLLER DEBUG - userId type:', typeof userId);
    
    const result = await GroupService.removeMember(groupId, userId, memberId);
    
    return successResponse(
      res,
      HTTP_STATUS.OK,
      result.message || 'Member removed successfully',
      result.data
    );
  } catch (error) {
    console.error('Controller removeMember error:', error.message, error.stack);
    next(error);
  }
}
// In group.controller.js
static async deleteGroup(req, res, next) {
  try {
    const result = await GroupService.deleteGroup(
      req.params.id,
      req.user._id
    );
    
    // FIX: Return 204 No Content as per test expectations
    return res.status(204).send();
    
  } catch (error) {
    logger.error(`Delete group failed: ${error.message}`);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
}
}