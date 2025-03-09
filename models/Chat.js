const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, default: "" },
  mediaUrl: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

const ChatSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null }, // Nullable for event-based chats
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null }, // Added event reference
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    messages: [MessageSchema],
    unreadCount: {
      type: Map,
      of: Number, // Stores unread message count per user ID
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema);
