import express from 'express';
const router = express.Router();
import friendController from '../controllers/friend.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  validateObjectId,
  validateRequest
} from '../middlewares/validation.middleware.js';

router.use(authenticate);

// GET /api/friends 
router.get('/', friendController.getFriends);

// GET /api/friends/requests 
router.get('/requests', friendController.getFriendRequests);

// POST /api/friends/:id 
router.post(
  '/sendFriendRequest',
  validateRequest,
  friendController.sendFriendRequest
);

// PATCH /api/friends/:id/accept
router.patch(
  '/:id/accept',
  validateObjectId('id'),
  validateRequest,
  friendController.acceptFriendRequest
);

// DELETE /api/friends/:id
router.delete(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  friendController.removeFriend
);

export default router;