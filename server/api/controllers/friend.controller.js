import FriendService from '../services/friend.service.js';
import { success } from '../../utils/response.js';
import logger from '../../utils/logger.js';

export default class FriendController {
  static async getFriends(req, res, next) {
    try {
      const friends = await FriendService.getFriends(req.user._id);
      success(res, friends);
    } catch (error) {
      logger.error(`Get friends failed: ${error.message}`);
      next(error);
    }
  }

  static async getFriendRequests(req, res, next) {
    try {
      const requests = await FriendService.getFriendRequests(req.user._id);
      success(res, requests);
    } catch (error) {
      logger.error(`Get friend requests failed: ${error.message}`);
      next(error);
    }
  }

  static async sendFriendRequest(req, res, next) {
    try {
      const request = await FriendService.sendFriendRequest(
        req.user._id,
        req.body.email
      );
      const message = 'Friend request sent successfully!';
      success(res, request, message);
    } catch (error) {
      logger.error(`Send friend request failed: ${error.message}`);
      next(error);
    }
  }

  static async acceptFriendRequest(req, res, next) {
    try {
      const request = await FriendService.acceptFriendRequest(
        req.params.id,
        req.user._id
      );
      success(res, request);
    } catch (error) {
      logger.error(`Accept friend request failed: ${error.message}`);
      next(error);
    }
  }

  static async rejectFriendRequest(req, res, next) {
    try {
      const request = await FriendService.rejectFriendRequest(
        req.params.id,
        req.user._id
      );
      success(res, request);
    } catch (error) {
      logger.error(`Reject friend request failed: ${error.message}`);
      next(error);
    }
  }

  static async removeFriend(req, res, next) {
    try {
      await FriendService.removeFriend(
        req.params.id,
        req.user._id
      );
      success(res, null, 204);
    } catch (error) {
      logger.error(`Remove friend failed: ${error.message}`);
      next(error);
    }
  }
}