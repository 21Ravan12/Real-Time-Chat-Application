import { body, param, validationResult } from 'express-validator';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import { error } from '../../utils/response.js';
import mongoose from 'mongoose';

// Express Validator Error Formatter
const validationErrorFormatter = ({ msg, param }) => {
  return {
    field: param,
    message: msg
  };
};

// Validate Request Middleware
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req).formatWith(validationErrorFormatter);
  
  if (!errors.isEmpty()) {
    return error(
      res,
      'Validation failed',
      HTTP_STATUS.BAD_REQUEST,
      errors.array()
    );
  }
  next();
};

// Common Validators
export const validateObjectId = (field) => 
  param(field).custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid ID format');
    }
    return true;
  });

// User Validators
export const validateRegister = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  
];

export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

export const validateLogout = [
  body('token')
    .optional()
    .isString().withMessage('Token must be a string')
    .notEmpty().withMessage('Token cannot be empty')
];

export const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
];

export const validateResetPassword = [
  body('newPassword')  
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
];

export const validateCompleteRegistration = [
  body('verificationCode')
    .notEmpty().withMessage('Verification code is required')
    .isString().withMessage('Verification code must be a string')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be exactly 6 characters'),
  body('redisKey')
    .notEmpty().withMessage('Redis key is required')
    .isString().withMessage('Redis key must be a string')
    .isLength({ min: 1 }).withMessage('Redis key cannot be empty')
]; 

// Chat Validators
export const validateMessage = [
  body('recipient')
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid recipient ID');
      }
      return true;
    }),
  
  body('group')
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid group ID');
      }
      return true;
    }),
  
  body('content')
    .if(body('messageType').equals('text'))
    .notEmpty().withMessage('Message content is required'),
  
  body('messageType')
    .isIn(['text', 'image', 'video', 'audio', 'file'])
    .withMessage('Invalid message type')
];
