import { PAGINATION } from './constants.js';
import mongoose from 'mongoose';

// Pagination helper
export const paginate = (query, { page = 1, limit = PAGINATION.DEFAULT_LIMIT }) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(Math.min(limit, PAGINATION.MAX_LIMIT));
};

// ID validation
export const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Async error handler wrapper
export const asyncHandler = (fn) => (req, res, next) => 
  Promise.resolve(fn(req, res, next)).catch(next);

// Generate random string
export const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Filter object properties
export const filterObject = (obj, ...allowedFields) => {
  const filteredObj = {};
  Object.keys(obj).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredObj[key] = obj[key];
    }
  });
  return filteredObj;
};

// Format duration (ms to HH:MM:SS)
export const formatDuration = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  return [hours, minutes, seconds]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
};