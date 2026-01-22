import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['private', 'group'],
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'private';
    }  
  }],
  // Grup sohbetleri için
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return this.type === 'group';
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ type: 1, updatedAt: -1 });

// Sanal alanlar
chatSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'chat'
});

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;