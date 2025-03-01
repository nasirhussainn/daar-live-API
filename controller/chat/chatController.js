const Chat = require("../../models/Chat"); // Import your Chat model
const Property = require("../../models/Properties"); // Import your Property model
const { uploadChatMedia } = require("../../config/cloudinary"); // Utility for media upload

exports.sendMessage = async (req, res, next, io) => {
  try {
    const { propertyId, senderId, text } = req.body;
    let mediaUrl = null;

    // Upload media if file is present
    if (req.file) {
      messageType = "image"
      mediaUrl = await uploadChatMedia(req.file.buffer, messageType);
    }

    // Find the property and its realtor (owner)
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const realtorId = property.owner_id; // Realtor ID (owner of the property)

    // Determine the other participant
    const otherParticipant = senderId === realtorId ? property.participants[0] : realtorId;

    // console.log(`${senderId} and ${otherParticipant} are chatting`);

    // Check if a chat already exists between the user and realtor for this property
    let chat = await Chat.findOne({
      propertyId,
      participants: { $all: [senderId, otherParticipant] },
    });

    // If no chat exists, create a new one
    if (!chat) {
      chat = new Chat({
        propertyId,
        participants: [senderId, otherParticipant],
        messages: [],
      });
    }

    // Create the new message
    const message = {
      senderId,
      text,
      mediaUrl,
      timestamp: new Date(),
    };

    // Add the message to the chat and save it
    chat.messages.push(message);
    await chat.save();

    // Emit the message to the Socket.IO room for this chat
    const roomId = `chat:${chat._id}`; // Unique room ID for this chat
    console.log(`Room for chatting: ${roomId}`);
    io.to(roomId).emit("newMessage", { chatId: chat._id, message });

    // Respond to the client
    res.status(200).json({ message: "Message sent", chat });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message", error: error.message });
  }
};


// Get All Chats for a Property
exports.getChatsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const chats = await Chat.find({ propertyId }).populate(
      "participants",
      "name email"
    );
    res.status(200).json(chats);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching chats", error: error.message });
  }
};

// Get Chat by ID
exports.getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate(
      "messages.senderId",
      "name email"
    );
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    res.status(200).json(chat);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching chat", error: error.message });
  }
};
