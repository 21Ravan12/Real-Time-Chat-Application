import mongoose from 'mongoose';
import { FRIEND_STATUS } from '../utils/constants.js';

const friendSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  friend: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: Object.values(FRIEND_STATUS),
    default: FRIEND_STATUS.PENDING
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure unique friend pairs
friendSchema.index({ user: 1, friend: 1 }, { unique: true });

const Friend = mongoose.model('Friend', friendSchema);

export default Friend;