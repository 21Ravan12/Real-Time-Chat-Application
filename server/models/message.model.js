import mongoose from 'mongoose';
import { MESSAGE_TYPES } from '../utils/constants.js';

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true
  },
  messageType: {
    type: String,
    enum: Object.values(MESSAGE_TYPES),
    default: MESSAGE_TYPES.TEXT
  },
  attachments: [{
    url: String,
    fileType: String,
    fileName: String
  }],
  readedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

messageSchema.pre('save', function(next) {
  // Only set if the message is new
  if (this.isNew) {
    this.readedBy.push({ user: this.sender, readAt: new Date() });
  }
  next();
});

// Indexes for faster querying
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1, chat: 1 });
messageSchema.index({ 'readedBy.user': 1 }); // Index for user-based read receipt queries

const Message = mongoose.model('Message', messageSchema);

export default Message;