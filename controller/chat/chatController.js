const Chat = require("../../models/Chat"); // Import your Chat model
const Property = require("../../models/Properties"); // Import your Property model
const Event = require("../../models/Events"); // Import your Event model
const { uploadChatMedia } = require("../../config/cloudinary"); // Utility for media upload

exports.sendMessage = async (req, res, next, io) => {
  try {
    const { chatId, referenceId, referenceType, senderId, senderType, text } =
      req.body;
    let mediaUrl = null;

    if (!["User", "Realtor", "Admin"].includes(senderType)) {
      return res.status(400).json({ message: "Invalid senderType" });
    }

    if (!["Property", "Event"].includes(referenceType)) {
      return res.status(400).json({ message: "Invalid referenceType" });
    }

    if (req.file) {
      const messageType = "image";
      mediaUrl = await uploadChatMedia(req.file.buffer, messageType);
    }

    if (!text && !mediaUrl) {
      return res
        .status(400)
        .json({ message: "Message must contain text or media" });
    }

    let chat;

    if (chatId) {
      chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
    } else {
      chat = await Chat.findOne({
        referenceId,
        referenceType,
        participants: {
          $elemMatch: {
            participant_id: senderId,
            participant_type: senderType,
          },
        },
      });

      if (!chat) {
        let ownerId, ownerType;

        if (referenceType === "Property") {
          const property = await Property.findById(referenceId);
          if (!property) {
            return res.status(404).json({ message: "Property not found" });
          }
          ownerId = property.owner_id;
          ownerType = property.created_by === "Admin" ? "Admin" : "Realtor";
        } else if (referenceType === "Event") {
          const event = await Event.findById(referenceId);
          if (!event) {
            return res.status(404).json({ message: "Event not found" });
          }
          ownerId = event.host_id;
          ownerType = event.created_by === "Admin" ? "Admin" : "Realtor";
        }

        chat = new Chat({
          referenceId,
          referenceType,
          participants: [
            { participant_id: senderId, participant_type: senderType },
            { participant_id: ownerId, participant_type: ownerType },
          ],
          messages: [],
          unreadCount: new Map(),
        });
      }
    }

    const message = {
      sender_id: senderId,
      sender_type: senderType,
      content: mediaUrl || text,
      timestamp: new Date(),
      is_read: false,
    };

    chat.messages.push(message);

    // **Update unreadCount for all participants except the sender**
    chat.participants.forEach((participant) => {
      const participantId = participant.participant_id.toString();

      if (participantId !== senderId) {
        chat.unreadCount.set(
          participantId,
          (chat.unreadCount.get(participantId) || 0) + 1
        );
      }
    });

    await chat.save();

    io.to(`chat:${chat._id}`).emit("newMessage", { chatId: chat._id, message });

    res.status(200).json({ message: "Message sent", chat });
  } catch (error) {
    console.error("Error sending message:", error);
    res
      .status(500)
      .json({ message: "Error sending message", error: error.message });
  }
};

// Get Chat by ID
exports.getChatById = async (req, res) => {
  const { userId, chatId } = req.params; // Ensure userId is provided
  const { referenceId } = req.query;

  try {
    let chat;

    if (chatId) {
      // Case 1: Fetch chat by chatId
      chat = await Chat.findById(chatId)
        .populate("messages.sender_id", "full_name email profile_picture")
        .exec();

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
    } else if (referenceId) {
      // Case 2: Fetch chat by referenceId & referenceType if chatId is not provided
      chat = await Chat.findOne({
        referenceId,
        "participants.participant_id": userId, // Check if user is a participant
      });

      if (!chat) {
        return res.status(200).json({}); // Return empty response for new chat initiation
      }
    } else {
      return res.status(400).json({
        message:
          "Invalid request. Provide chatId or (referenceId & referenceType).",
      });
    }

    let updated = false;

    // **Mark all messages as read for this user**
    chat.messages.forEach((msg) => {
      if (msg.sender_id.toString() !== userId && !msg.is_read) {
        msg.is_read = true;
        updated = true;
      }
    });

    // **Reset unread count for this user**
    if (chat.unreadCount && chat.unreadCount.has(userId)) {
      chat.unreadCount.set(userId, 0);
      updated = true;
    }

    if (updated) await chat.save(); // Save only if changes were made

    return res.status(200).json(chat);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching chat", error: error.message });
  }
};

// Get all chats for a participant (user or realtor)
exports.getChatsByParticipant = async (req, res) => {
  try {
    const participantId = req.params.participantId;

    const chats = await Chat.find({
      "participants.participant_id": participantId,
    });

    if (!chats || chats.length === 0) {
      return res
        .status(404)
        .json({ message: "No chats found for this participant" });
    }

    const formattedChats = chats
      .map((chat) => {
        if (!chat.participants || chat.participants.length !== 2) {
          console.warn(
            `Chat ${chat._id} has invalid participants:`,
            chat.participants
          );
          return null;
        }

        // Determine the other participant (receiver)
        const receiver = chat.participants.find(
          (p) =>
            p.participant_id && p.participant_id.toString() !== participantId
        );

        if (!receiver) {
          console.warn(`Chat ${chat._id} is missing a receiver`);
          return null;
        }

        const lastMessage =
          chat.messages.length > 0
            ? chat.messages[chat.messages.length - 1]
            : null;
        const unreadCount = chat.unreadCount?.get(participantId) || 0;

        let lastMessageText = null;

        if (lastMessage && lastMessage.content) {
          const mediaExtensions = {
            image: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
            video: [".mp4", ".mov", ".avi", ".mkv"],
            audio: [".mp3", ".wav", ".ogg", ".m4a"],
            document: [".pdf", ".docx", ".xlsx", ".pptx"],
          };

          // Check if the content is a URL or plain text
          if (lastMessage.content.startsWith("http")) {
            const extension = lastMessage.content
              .split(".")
              .pop()
              .toLowerCase();

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
          } else {
            // If content is not a URL, assume it's plain text
            lastMessageText = lastMessage.content;
          }
        }

        return {
          chat_id: chat._id,
          sender_id: participantId,
          receiver_id: receiver.participant_id._id,
          reference_id: chat.referenceId || null,
          reference_type: chat.referenceType || null,
          last_message: lastMessageText,
          receiver_name: receiver.participant_id.full_name,
          receiver_profilePic: receiver.participant_id.profile_picture,
          last_message_time: lastMessage
            ? lastMessage.timestamp
            : chat.updatedAt,
          unread_count: unreadCount,
        };
      })
      .filter((chat) => chat !== null);

    res.status(200).json(formattedChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res
      .status(500)
      .json({ message: "Error fetching chats", error: error.message });
  }
};
