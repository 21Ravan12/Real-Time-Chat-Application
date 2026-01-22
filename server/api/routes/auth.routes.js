import express from 'express';
const router = express.Router();
import authController from '../controllers/auth.controller.js';
import {
  validateRegister,
  validateLogin,
  validateCompleteRegistration,
  validateLogout,
  validateForgotPassword,
  validateResetPassword,
  validateRequest
} from '../middlewares/validation.middleware.js';

router.post(
  '/register',
  validateRegister,
  validateRequest,
  authController.register
);

router.post(
  '/completeRegistration',
  validateCompleteRegistration,
  validateRequest,
  authController.completeRegistration
);

router.post(
  '/login',
  validateLogin,
  validateRequest,
  authController.login
);

router.post(
  '/refresh',
  validateRequest,
  authController.refreshToken
);

router.post(
  '/logout',
  validateLogout,
  validateRequest,
  authController.logout
);

router.post(
  '/forgot-password/sendCode',
  validateForgotPassword,
  validateRequest,
  authController.forgotPassword
);

router.post(
  '/forgot-password/verifyCode',
  validateRequest,
  authController.forgotPasswordVerify
);

router.post(
  '/reset-password',
  validateResetPassword,
  validateRequest,
  authController.resetPassword
);

export default router;