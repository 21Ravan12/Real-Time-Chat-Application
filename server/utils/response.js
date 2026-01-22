import { HTTP_STATUS } from './constants.js';

/**
 * Success Response
 * @param {Response} res 
 * @param {*} data 
 * @param {string} message 
 * @param {number} statusCode 
 */
export const success = (res, data = null, message = 'Success', statusCode = HTTP_STATUS.SUCCESS) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Error Response
 * @param {Response} res 
 * @param {string} message 
 * @param {number} statusCode 
 * @param {*} errors 
 */
export const error = (res, message = 'Error', statusCode = HTTP_STATUS.BAD_REQUEST, errors = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

/**
 * Paginated Response
 * @param {Response} res 
 * @param {*} data 
 * @param {object} pagination 
 * @param {string} message 
 */
export const paginated = (res, data, pagination, message = 'Paginated results') => {
  res.status(HTTP_STATUS.SUCCESS).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit)
    }
  });
};

/**
 * Validation Error Response
 * @param {Response} res 
 * @param {*} errors 
 */
export const validationError = (res, errors) => {
  error(
    res,
    'Validation failed',
    HTTP_STATUS.BAD_REQUEST,
    errors.array ? errors.array() : errors
  );
};