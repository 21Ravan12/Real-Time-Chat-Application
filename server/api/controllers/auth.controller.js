import AuthService from '../services/auth.service.js';
import { success } from '../../utils/response.js';
import { ERROR_MESSAGES } from '../../utils/constants.js';
import logger from '../../utils/logger.js';
import { response } from 'express';

export default class AuthController {
  static async register(req, res, next) {
    try {
      const { redisKey, message } = await AuthService.register(req.body);

      return res.json({ message, redisKey });
    } catch (error) {
      logger.error(`Registration failed: ${error.message}`);
      next(error);
    }
  }

  static async completeRegistration(req, res, next) {
    try {
      const { user, token } = await AuthService.completeRegistration(req.body);
      
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 gün
      });

      return res.json({ user, token, message: 'Registration completed successfully!' });
    } catch (error) {
      logger.error(`Complete registration failed: ${error.message}`);
      next(error);
    }
  }

  static async login(req, res, next) {
  try {
    const { user, token, message } = await AuthService.login(
      req.body.email, 
      req.body.password
    );

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json(message === 'Login successful!' ? { message, user, token } : { message });
  } catch (error) {
    logger.error(`Login failed: ${error.message}`);
    next(error);
  }
  }

  static async logout(req, res) {
    res.cookie('jwt', '', {
      httpOnly: true,
      expires: new Date(0)
    });
    success(res, null, 204);
  }

  static async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies.jwt;
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: ERROR_MESSAGES.UNAUTHORIZED
        });
      }

      const newToken = await AuthService.refreshToken(refreshToken);
      
      res.cookie('jwt', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      success(res, { token: newToken });
    } catch (error) {
      logger.error(`Token refresh failed: ${error.message}`);
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { redisKey, message } = await AuthService.sendVerificationCodeForResetPassword(req.body.email);
      
      return res.json({ 
        message,
        redisKey // Development için
      });
    } catch (error) {
      logger.error(`Forgot password failed: ${error.message}`);
      next(error);
    }
  }

  static async forgotPasswordVerify(req, res, next) {
    try {
      const { token } = await AuthService.verifyCodeForResetPassword(req.body);

      console.log('Verification token:', token);
      
      res.cookie('resetToken', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000 // 5 dakika
      });

      return res.json({ message: 'Code successfully verified!', token });
    } catch (error) {
      logger.error(`Complete registration failed: ${error.message}`);
      next(error);
    }
  }

static async resetPassword(req, res) {
    try {
        const newPassword = req.body.newPassword;
        let token;
        
        // Check Authorization header first
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Fallback to cookies if no header
        else if (req.cookies.resetToken) {
            token = req.cookies.resetToken;
        }

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        token = token.replace(/^"(.*)"$/, '$1');
        console.log('Reset token from header:', token);

        await AuthService.resetPassword(token, newPassword);
        return res.json({ message: 'Password reset successfully' });
    } catch (error) {
        logger.error(`Reset password failed: ${error.message}`);
        res.status(500).json({ message: 'Failed to reset password' });
    } 
  }
}