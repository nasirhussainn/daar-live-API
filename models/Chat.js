const mongoose = require('mongoose');
const { Schema } = mongoose;

const ChatSchema = new Schema(
  {
    referenceId: { type: Schema.Types.ObjectId, required: true }, 
    referenceType: { 
      type: String, 
      enum: ['Property', 'Event', 'Admin'], 
      required: true 
    },

    participants: [
      {
        participant_id: { type: Schema.Types.ObjectId, required: true, refPath: "participants.participant_type" },
        participant_type: { type: String, enum: ['User', 'Realtor', 'Admin'], required: true }
      }
    ],

    messages: [
      {
        sender_id: { type: Schema.Types.ObjectId, required: true, refPath: "messages.sender_type" },
        sender_type: { type: String, enum: ['User', 'Realtor', 'Admin'], required: true },
        content: { type: String, required: true }, // Text or media URL
        is_media: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
        is_read: { type: Boolean, default: false }
      }
    ],
    unreadCount: {
      type: Map,
      of: Number, 
      default: {},
    },
  },
  { timestamps: true }
);

const Chat = mongoose.model('Chat', ChatSchema);
module.exports = Chat;
