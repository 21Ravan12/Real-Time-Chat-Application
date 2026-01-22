import { ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import logger from '../../utils/logger.js';
import { error } from '../../utils/response.js';

// Development error handler
export const sendErrorDev = (err, res) => {
  res.status(err.statusCode || HTTP_STATUS.SERVER_ERROR).json({
    success: false,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

// Production error handler
export const sendErrorProd = (err, res) => {
  // Operational, trusted errors
  if (err.isOperational) {
    res.status(err.statusCode || HTTP_STATUS.SERVER_ERROR).json({
      success: false,
      message: err.message
    });
  } 
  // Programming or other unknown errors
  else {
    // 1) Log error
    logger.error('ERROR 💥:', err);

    // 2) Send generic message
    res.status(HTTP_STATUS.SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// Global Error Handler Middleware
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || HTTP_STATUS.SERVER_ERROR;

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    if (err.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (err.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, res);
  }
};

// Database Error Handlers
export const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return {
    message,
    statusCode: HTTP_STATUS.BAD_REQUEST,
    isOperational: true
  };
};

export const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return {
    message,
    statusCode: HTTP_STATUS.BAD_REQUEST,
    isOperational: true
  };
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return {
    message,
    statusCode: HTTP_STATUS.BAD_REQUEST,
    isOperational: true
  };
};

// JWT Error Handlers
const handleJWTError = () => ({
  message: 'Invalid token. Please log in again!',
  statusCode: HTTP_STATUS.UNAUTHORIZED,
  isOperational: true
});

const handleJWTExpiredError = () => ({
  message: 'Your token has expired! Please log in again.',
  statusCode: HTTP_STATUS.UNAUTHORIZED,
  isOperational: true
});