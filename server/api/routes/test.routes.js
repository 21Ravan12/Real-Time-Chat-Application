import express from 'express';
const router = express.Router();
import { captureSentryError, captureSentryMessage } from '../../api/middlewares/sentry.middleware.js';

/**
 * @route   GET /api/v1/test/sentry/error
 * @access  Public
 */
router.get('/sentry/error', (req, res, next) => {
  const testError = new Error('Sentry test error - This is a test error for Sentry integration');
  testError.statusCode = 500;
  testError.code = 'TEST_ERROR_001';
  testError.isOperational = true;
  next(testError);
});

/**
 * @route   GET /api/v1/test/sentry/unhandled
 * @desc    Unhandled exception test
 * @access  Public
 */
router.get('/sentry/unhandled', () => {
  throw new Error('Unhandled exception test - This should be captured by Sentry');
});

/**
 * @route   GET /api/v1/test/sentry/message
 * @desc    Sentry message capture test
 * @access  Public
 */
router.get('/sentry/message', (req, res) => {
  captureSentryMessage('Test message from RealTalk API', 'info', {
    endpoint: '/api/v1/test/sentry/message',
    userAgent: req.get('user-agent'),
    testId: 'MSG_TEST_001'
  });
  
  res.json({ 
    success: true, 
    message: 'Test message sent to Sentry' 
  });
});

/**
 * @route   GET /api/v1/test/sentry/async-error
 * @desc    Async error test
 * @access  Public
 */
router.get('/sentry/async-error', async (req, res, next) => {
  try {
    // Simulate async operation that fails
    await Promise.reject(new Error('Async operation failed'));
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/test/sentry/validation-error
 * @desc    Validation error test
 * @access  Public
 */
router.get('/sentry/validation-error', (req, res, next) => {
  const validationError = new Error('Validation failed');
  validationError.statusCode = 400;
  validationError.code = 'VALIDATION_ERROR';
  validationError.details = {
    email: 'Invalid email format',
    password: 'Password too short'
  };
  next(validationError);
});

export default router;