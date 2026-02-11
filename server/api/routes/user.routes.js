import express from 'express';
const router = express.Router();
import userController from '../controllers/user.controller.js';
import { authenticate, restrictTo } from '../middlewares/auth.middleware.js';
import { validateObjectId, validateRequest } from '../middlewares/validation.middleware.js';
import multer from 'multer';
import { cloudinaryUploadMiddleware } from '../middlewares/upload.middleware.js'; // YENİ

// Multer configuration for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`));
    }
  }
});

// ===== PUBLIC/ALL USER ROUTES =====

// GET /api/users/me - Get current user profile
router.get('/me', authenticate, userController.getMe);

// PATCH /api/users/ - Update current user profile (WITH AVATAR SUPPORT)
router.patch(
  '/',
  authenticate,
  upload.single('avatar'), // Memory'ye upload et
  validateRequest, // Diğer validation'lar
  userController.updateUser // Controller Cloudinary'i handle edecek
);

// DELETE /api/users/delete-me - Soft delete own account
router.delete('/delete-me', authenticate, userController.deleteUser);

// ===== ADMIN ROUTES =====
router.use(authenticate, restrictTo('admin'));

// GET /api/users - Get all users (admin only)
router.get('/', userController.getAllUsers);

// GET /api/users/:id - Get user by ID (admin only)
router.get(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  userController.getUser
);

// DELETE /api/users/:id - Delete user by ID (admin only)
router.delete(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  userController.deleteUserById
);

export default router;
