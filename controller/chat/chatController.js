const Chat = require("../../models/Chat"); // Import your Chat model
const Property = require("../../models/Properties"); // Import your Property model
const { uploadChatMedia } = require("../../config/cloudinary"); // Utility for media upload

exports.sendMessage = async (req, res, next, io) => {
  try {
    const { chatId, propertyId, senderId, text } = req.body;
    let mediaUrl = null;

    if (req.file) {
      const messageType = "image";
      mediaUrl = await uploadChatMedia(req.file.buffer, messageType);
    }

    let chat;

    if (chatId) {
      chat = await Chat.findById(chatId);
    } else {
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const realtorId = property.owner_id;

      chat = await Chat.findOne({
        propertyId,
        participants: { $all: [senderId, realtorId] },
      });

      if (!chat) {
        chat = new Chat({
          propertyId,
          participants: [senderId, realtorId],
          messages: [],
          unreadCount: new Map([
            [senderId, 0],
            [realtorId, 0],
          ]),
        });
      }
    }

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const message = {
      senderId,
      text,
      mediaUrl,
      timestamp: new Date(),
    };

    chat.messages.push(message);

    // ✅ Correctly update unread count for the receiver
    chat.participants.forEach((participant) => {
      if (participant.toString() !== senderId) {
        const currentUnreadCount = chat.unreadCount.get(participant.toString()) || 0;
        chat.unreadCount.set(participant.toString(), currentUnreadCount + 1);
      }
    });

    await chat.save();

    io.to(`chat:${chat._id}`).emit("newMessage", { chatId: chat._id, message });

    res.status(200).json({ message: "Message sent", chat });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message", error: error.message });
  }
};



// Get Chat by ID
exports.getChatById = async (req, res) => {
  const { userId, chatId } = req.params; // userId is required
  const { propertyId } = req.query; // propertyId is optional (for case 2)

  try {
    let chat;

    if (chatId) {
      // Case 1: Fetch chat by chatId
      chat = await Chat.findById(chatId).populate("messages.senderId", "name email");

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

    } else if (propertyId) {
      // Case 2: Fetch chat by propertyId & userId
      chat = await Chat.findOne({
        propertyId,
        participants: { $in: [userId] },
      }).populate("messages.senderId", "name email");

      if (!chat) {
        return res.status(200).json({}); // Return empty response for "Send Message" flow
      }
    } else {
      return res.status(400).json({ message: "Invalid request. Provide chatId or propertyId." });
    }

    // Reset unread count for the user if needed
    let updated = false;
    if (chat.unreadCount.has(userId)) {
      chat.unreadCount.set(userId, 0);
      updated = true;
    }

    if (updated) await chat.save(); // Save only if changes were made

    return res.status(200).json(chat);

  } catch (error) {
    res.status(500).json({ message: "Error fetching chat", error: error.message });
  }
};

// Get all chats for a participant (user or realtor)
exports.getChatsByParticipant = async (req, res) => {
  try {
    const participantId = req.params.participantId;

    const chats = await Chat.find({
      participants: participantId,
    })
      .populate("participants", "full_name profile_picture email")
      .populate({
        path: "messages.senderId",
        select: "full_name email",
      })
      .select("participants propertyId messages createdAt updatedAt unreadCount");

    if (!chats || chats.length === 0) {
      return res.status(404).json({ message: "No chats found for this participant" });
    }

    const formattedChats = chats
      .map((chat) => {
        if (!chat.participants || chat.participants.length !== 2) {
          console.warn(`Chat ${chat._id} has invalid participants:`, chat.participants);
          return null;
        }

        // Determine the other participant (receiver)
        const receiver = chat.participants.find((p) => p._id.toString() !== participantId);
        if (!receiver) {
          console.warn(`Chat ${chat._id} is missing a receiver`);
          return null;
        }

        const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;

        // ✅ Correct unread count fetching
        const unreadCount = chat.unreadCount?.get(participantId) || 0;

        let lastMessageText = null;
        if (lastMessage) {
          if (lastMessage.text) {
            lastMessageText = lastMessage.text;
          } else if (lastMessage.mediaUrl) {
            const mediaExtensions = {
              image: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
              video: [".mp4", ".mov", ".avi", ".mkv"],
              audio: [".mp3", ".wav", ".ogg", ".m4a"],
              document: [".pdf", ".docx", ".xlsx", ".pptx"],
            };

            const extension = lastMessage.mediaUrl.split(".").pop().toLowerCase();

            if (mediaExtensions.image.includes(`.${extension}`)) {
              lastMessageText = "📷 Photo";
            } else if (mediaExtensions.video.includes(`.${extension}`)) {
              lastMessageText = "🎥 Video";
            } else if (mediaExtensions.audio.includes(`.${extension}`)) {
              lastMessageText = "🎵 Audio";
            } else if (mediaExtensions.document.includes(`.${extension}`)) {
              lastMessageText = "📄 Document";
            } else {
              lastMessageText = "📎 Attachment";
            }
          }
        }

        return {
          chat_id: chat._id,
          sender_id: participantId,
          receiver_id: receiver._id,
          property_id: chat.propertyId?._id || null,
          last_message: lastMessageText,
          receiver_name: receiver.full_name,
          receiver_profilePic: receiver.profile_picture,
          last_message_time: lastMessage ? lastMessage.timestamp : chat.updatedAt,
          unread_count: unreadCount, // ✅ Now correctly fetched
        };
      })
      .filter((chat) => chat !== null);

    res.status(200).json(formattedChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Error fetching chats", error: error.message });
  }
};


