const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // messageType: { type: String, enum: ["text", "image", "voice"], required: true },
  text: { type: String, default: "" },
  mediaUrl: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

const ChatSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  messages: [MessageSchema],
}, { timestamps: true });

module.exports = mongoose.model("Chat", ChatSchema);
