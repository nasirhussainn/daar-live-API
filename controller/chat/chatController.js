const Chat = require("../../models/Chat"); // Import your Chat model
const Property = require("../../models/Properties"); // Import your Property model
const User = require("../../models/User"); // Import your User model
const Admin = require("../../models/Admin"); // Import your Admin model
const Event = require("../../models/Events"); // Import your Event model
const { uploadChatMedia } = require("../../config/cloudinary"); // Utility for media upload

exports.sendMessage = async (req, res, next, io) => {
  try {
    const {
      chatId,
      referenceId,
      referenceType,
      senderId,
      senderType,
      text,
      message_type, // Now directly from req.body
    } = req.body;
    
    let mediaUrl = null;

    if (!["User", "Realtor", "Admin"].includes(senderType)) {
      return res.status(400).json({ message: "Invalid senderType" });
    }

    if (!["Property", "Event"].includes(referenceType)) {
      return res.status(400).json({ message: "Invalid referenceType" });
    }

    if (!["text", "image", "audio"].includes(message_type)) {
      return res.status(400).json({ message: "Invalid message_type" });
    }

    // Handle media upload if applicable
    if (req.file) {
      mediaUrl = await uploadChatMedia(req.file.buffer, message_type);
    }

    if (message_type === "text" && !text) {
      return res.status(400).json({ message: "Text message cannot be empty" });
    }

    if ((message_type === "image" || message_type === "audio") && !mediaUrl) {
      return res.status(400).json({ message: "Media file is required" });
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
      message_type, // Now set based on req.body
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
      chat = await Chat.findById(chatId).exec();

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
    } else if (referenceId) {
      // Case 2: Fetch chat by referenceId & referenceType if chatId is not provided
      chat = await Chat.findOne({
        referenceId,
        "participants.participant_id": userId, // Check if user is a participant
      }).exec();

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
      if (
        msg.sender_id &&
        msg.sender_id.toString() !== userId &&
        !msg.is_read
      ) {
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

    // Fetch chats without populating
    const chats = await Chat.find({
      "participants.participant_id": participantId,
    }).exec();

    if (!chats || chats.length === 0) {
      return res
        .status(404)
        .json({ message: "No chats found for this participant" });
    }

    // Function to fetch participant details
    const getParticipantDetails = async (participant) => {
      if (!participant || !participant.participant_id) return null;

      let details = null;
      if (["User", "Realtor"].includes(participant.participant_type)) {
        details = await User.findById(participant.participant_id, {
          full_name: 1,
          profile_picture: 1,
          email: 1,
        }).exec();
      } else if (participant.participant_type === "Admin") {
        details = await Admin.findById(participant.participant_id, {
          full_name: 1,
          profile_picture: 1,
          email: 1,
        }).exec();
        if (details) {
          details.full_name = details.full_name || "Daar Live"; // Default name
        }
      }

      return details;
    };

    // Process chats
    const formattedChats = await Promise.all(
      chats.map(async (chat) => {
        if (!chat.participants || chat.participants.length !== 2) {
          console.warn(`Chat ${chat._id} has invalid participants:`, chat.participants);
          return null;
        }

        // Determine sender and receiver
        const sender = chat.participants.find((p) => p.participant_id.toString() === participantId);
        const receiver = chat.participants.find((p) => p.participant_id.toString() !== participantId);

        if (!receiver) {
          console.warn(`Chat ${chat._id} is missing a receiver`);
          return null;
        }

        // Fetch participant details
        const senderDetails = await getParticipantDetails(sender);
        const receiverDetails = await getParticipantDetails(receiver);

        if (!senderDetails || !receiverDetails) {
          console.warn(`Participant details missing for chat ${chat._id}`);
          return null;
        }

        // Extract last message
        const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
        const unreadCount = chat.unreadCount?.get(participantId) || 0;

        let lastMessageText = null;

        if (lastMessage) {
          if (lastMessage.message_type === "text") {
            lastMessageText = lastMessage.content;
          } else if (lastMessage.message_type === "image") {
            lastMessageText = "📷 Photo";
          } else if (lastMessage.message_type === "audio") {
            lastMessageText = "🎵 Audio";
          } else {
            lastMessageText = "📎 Attachment";
          }
        }

        return {
          chat_id: chat._id,
          sender_id: participantId,
          sender_name: senderDetails.full_name,
          sender_profilePic: senderDetails.profile_picture,
          sender_email: senderDetails.email,
          receiver_id: receiver.participant_id,
          receiver_name: receiverDetails.full_name,
          receiver_profilePic: receiverDetails.profile_picture,
          receiver_email: receiverDetails.email,
          reference_id: chat.referenceId || null,
          reference_type: chat.referenceType || null,
          last_message: lastMessageText,
          last_message_time: lastMessage ? lastMessage.timestamp : chat.updatedAt,
          unread_count: unreadCount,
        };
      })
    );

    // Filter out null values
    const filteredChats = formattedChats.filter((chat) => chat !== null);

    res.status(200).json(filteredChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Error fetching chats", error: error.message });
  }
};


exports.getChatHeadersByReferenceId = async (req, res) => {
  try {
    const { referenceId } = req.params;

    if (!referenceId) {
      return res.status(400).json({ message: "Reference ID is required" });
    }

    // Find all chats matching the referenceId
    const chats = await Chat.find({ referenceId }).exec();

    if (!chats || chats.length === 0) {
      return res
        .status(404)
        .json({ message: "No chats found for this reference" });
    }

    // Populate participant details
    const formattedChats = await Promise.all(
      chats.map(async (chat) => {
        const participants = await Promise.all(
          chat.participants.map(async (participant) => {
            let userDetails = null;

            if (
              participant.participant_type === "User" ||
              participant.participant_type === "Realtor"
            ) {
              userDetails = await User.findById(participant.participant_id, {
                full_name: 1,
                profile_picture: 1,
              }).exec();
            } else if (participant.participant_type === "Admin") {
              userDetails = await Admin.findById(participant.participant_id, {
                full_name: 1,
                profile_picture: 1,
              }).exec();
              if (userDetails) {
                userDetails.full_name = userDetails.full_name || "Daar Live"; // Default name if not present
              }
            }

            return userDetails
              ? {
                  participant_id: participant.participant_id,
                  full_name: userDetails.full_name,
                  profile_picture: userDetails.profile_picture,
                  participant_type: participant.participant_type,
                }
              : null;
          })
        );

        return {
          chat_id: chat._id,
          reference_id: chat.referenceId,
          reference_type: chat.referenceType || null,
          participants: participants.filter((p) => p !== null), // Filter out null values
        };
      })
    );

    return res.status(200).json(formattedChats);
  } catch (error) {
    console.error("Error fetching chat headers:", error);
    res
      .status(500)
      .json({ message: "Error fetching chat headers", error: error.message });
  }
};

exports.getChatDetailsById = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ message: "Chat ID is required" });
    }

    // Find chat by ID
    const chat = await Chat.findById(chatId).exec();

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Populate participant details
    const participants = await Promise.all(
      chat.participants.map(async (participant) => {
        let userDetails = null;

        if (
          participant.participant_type === "User" ||
          participant.participant_type === "Realtor"
        ) {
          userDetails = await User.findById(participant.participant_id, {
            full_name: 1,
            profile_picture: 1,
          }).exec();
        } else if (participant.participant_type === "Admin") {
          userDetails = await Admin.findById(participant.participant_id, {
            full_name: 1,
            profile_picture: 1,
          }).exec();
          if (userDetails) {
            userDetails.full_name = userDetails.full_name || "Daar Live"; // Default name if not present
          }
        }

        return userDetails
          ? {
              participant_id: participant.participant_id,
              full_name: userDetails.full_name,
              profile_picture: userDetails.profile_picture,
              participant_type: participant.participant_type,
            }
          : null;
      })
    );

    // Mark all messages as read
    let updated = false;
    chat.messages.forEach((msg) => {
      if (!msg.is_read) {
        msg.is_read = true;
        updated = true;
      }
    });

    if (updated) await chat.save();

    return res.status(200).json({
      chat_id: chat._id,
      reference_id: chat.referenceId,
      reference_type: chat.referenceType || null,
      participants: participants.filter((p) => p !== null), // Filter out null values
      messages: chat.messages, // All chat messages
    });
  } catch (error) {
    console.error("Error fetching chat details:", error);
    res
      .status(500)
      .json({ message: "Error fetching chat details", error: error.message });
  }
};
