import express from 'express';
const router = express.Router();
import userController from '../controllers/user.controller.js';
import { authenticate, restrictTo } from '../middlewares/auth.middleware.js';
import { validateObjectId, validateRequest } from '../middlewares/validation.middleware.js';
import multer from 'multer';

const upload = multer({ dest: 'tmp/' });

// GET /api/users
router.get(
  '/',
  authenticate,
  restrictTo('admin'),
  userController.getAllUsers
);

// GET /api/users/me
router.get('/me', authenticate, userController.getMe);

// GET /api/users/:id 
router.get(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  userController.getUser 
);

router.patch(
  '/',
  validateRequest,
  upload.single('avatar'),  
  authenticate,
  userController.updateUser
);

// DELETE /api/users/delete-me 
router.delete('/delete-me', authenticate, userController.deleteUser);

// ADMIN ROUTES
router.use(authenticate, restrictTo('admin'));

// DELETE /api/users/:id 
router.delete(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  userController.deleteUserById
);

export default router;