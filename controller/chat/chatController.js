const Chat = require("../../models/Chat");
const { uploadChatMedia } = require("../../config/cloudinary");

// Send Message (Text, Image, Voice)
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, senderId, messageType, text } = req.body;
    let mediaUrl = null;

    if (req.file) {
      mediaUrl = await uploadChatMedia(req.file.buffer, messageType);
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const message = { senderId, messageType, text, mediaUrl, timestamp: new Date() };
    chat.messages.push(message);
    await chat.save();

    res.status(200).json({ message: "Message sent", chat });
  } catch (error) {
    res.status(500).json({ message: "Error sending message", error: error.message });
  }
};

// Get All Chats for a Property
exports.getChatsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const chats = await Chat.find({ propertyId }).populate("participants", "name email");
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: "Error fetching chats", error: error.message });
  }
};

// Get Chat by ID
exports.getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate("messages.senderId", "name email");
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: "Error fetching chat", error: error.message });
  }
};
