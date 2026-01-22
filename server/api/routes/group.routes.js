import express from 'express';
const router = express.Router();
import groupController from '../controllers/group.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  validateObjectId,
  validateRequest
} from '../middlewares/validation.middleware.js';

router.use(authenticate);

router.get('/', groupController.getUserGroups);

router.post('/', groupController.createGroup);

router.get(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  groupController.getGroup
);

router.patch(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  groupController.updateGroup
);

router.post(
  '/:id/members',
  validateObjectId('id'),
  validateRequest,
  groupController.addGroupMember
);

router.delete(
  '/:id/members/:memberId',
  validateObjectId('id'),
  validateObjectId('memberId'),
  validateRequest,
  groupController.removeGroupMember
);

router.delete(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  groupController.deleteGroup
);

export default router;