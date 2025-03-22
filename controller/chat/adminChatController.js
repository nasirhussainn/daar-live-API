const AdminChat = require("../../models/admin/AdminChat");
const Admin = require("../../models/Admin");
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const { uploadChatMedia } = require("../../config/cloudinary");

async function getSuperAdminId() {
  try {
    const superAdmin = await Admin.findOne({ role: "super" }).select("_id");
    return superAdmin ? superAdmin._id : null;
  } catch (error) {
    console.error("Error fetching Super Admin:", error);
    return null;
  }
}

exports.sendAdminDirectMessage = async (req, res, next, io) => {
  try {
    const { senderId, senderType, text, chatId } = req.body;
    let mediaUrl = null;

    // Ensure senderType is valid
    if (!["User", "Realtor", "Admin"].includes(senderType)) {
      return res.status(400).json({
        message: "Invalid senderType. Must be User, Realtor, or Admin.",
      });
    }

    // Upload media if provided
    if (req.file) {
      mediaUrl = await uploadChatMedia(req.file.buffer, "image");
    }

    if (!text && !mediaUrl) {
      return res
        .status(400)
        .json({ message: "Message must contain text or media" });
    }

    let chat;

    if (chatId) {
      // **Case 1: Admin Replying (chatId is provided)**
      chat = await AdminChat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
    } else {
      // **Case 2: User/Realtor Sending a Message (First Message or Reply to Admin)**
      const superAdminId = await getSuperAdminId();
      if (!superAdminId) {
        return res.status(400).json({ message: "Super Admin not found" });
      }

      chat = await AdminChat.findOne({
        "participants.participant_id": { $all: [senderId, superAdminId] },
      });
      

      if (!chat) {
        // **New chat is created if it doesn't exist**
        chat = new AdminChat({
          referenceId: superAdminId,
          participants: [
            { participant_id: senderId, participant_type: senderType },
            { participant_id: superAdminId, participant_type: "Admin" },
          ],
          messages: [],
          unreadCount: new Map(),
        });
      }
    }

    // **Create message object**
    const message = {
      sender_id: senderId,
      sender_type: senderType,
      content: mediaUrl || text,
      is_media: !!mediaUrl,
      timestamp: new Date(),
      is_read: false,
    };

    // **Append message to chat**
    chat.messages.push(message);

    // **Update unread count for the receiver**
    const receiverId = chat.participants.find(
      (p) => p.participant_id.toString() !== senderId.toString()
    ).participant_id;
    const receiverIdStr = receiverId.toString();
    chat.unreadCount.set(
      receiverIdStr,
      (chat.unreadCount.get(receiverIdStr) || 0) + 1
    );

    await chat.save();

    // **Emit event for real-time chat update**
    io.to(`chat:${chat._id}`).emit("newMessage", { chatId: chat._id, message });

    res.status(200).json({ message: "Message sent", chat });
  } catch (error) {
    console.error("Error sending direct message:", error);
    res
      .status(500)
      .json({ message: "Error sending message", error: error.message });
  }
};

exports.getAdminChatsByParticipant = async (req, res) => {
  try {
    const superAdminId = await getSuperAdminId();
    const participantId = superAdminId.toString();

    // Fetch chats without populating
    const chats = await AdminChat.find({
      "participants.participant_id": participantId,
    }).exec();

    if (!chats || chats.length === 0) {
      return res
        .status(404)
        .json({ message: "No chats found for this participant" });
    }

    // Manually populate participant details
    const formattedChats = await Promise.all(
      chats.map(async (chat) => {
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

        // Fetch receiver details manually
        let receiverDetails = null;
        if (
          receiver.participant_type === "User" ||
          receiver.participant_type === "Realtor"
        ) {
          receiverDetails = await User.findById(receiver.participant_id, {
            full_name: 1,
            profile_picture: 1,
            email: 1,
          }).exec();
        } else if (receiver.participant_type === "Admin") {
          receiverDetails = await Admin.findById(receiver.participant_id, {
            full_name: 1,
            profile_picture: 1,
            email: 1,
          }).exec();
          if (receiverDetails) {
            receiverDetails.full_name =
              receiverDetails.full_name || "Daar Live Customer Support"; // Default name if not present
          }
        }

        if (!receiverDetails) {
          console.warn(`Receiver details not found for chat ${chat._id}`);
          return null;
        }

        // Fetch sender details manually
        let senderDetails = null;
        const sender = chat.participants.find(
          (p) =>
            p.participant_id && p.participant_id.toString() === participantId
        );

        if (sender) {
          if (
            sender.participant_type === "User" ||
            sender.participant_type === "Realtor"
          ) {
            senderDetails = await User.findById(sender.participant_id, {
              full_name: 1,
              profile_picture: 1,
              email: 1,
            }).exec();
          } else if (sender.participant_type === "Admin") {
            senderDetails = await Admin.findById(sender.participant_id, {
              full_name: 1,
              profile_picture: 1,
              email: 1,
            }).exec();
            if (senderDetails) {
              senderDetails.full_name =
                senderDetails.full_name || "Daar Live Customer Support"; // Default name if not present
            }
          }
        }

        if (!senderDetails) {
          console.warn(`Sender details not found for chat ${chat._id}`);
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
          sender_name: senderDetails.full_name, // Sender's full name
          sender_profilePic: senderDetails.profile_picture, // Sender's profile picture
          sender_email: senderDetails.email, // Sender's email
          receiver_id: receiver.participant_id,
          receiver_name: receiverDetails.full_name, // Receiver's full name
          receiver_profilePic: receiverDetails.profile_picture, // Receiver's profile picture
          receiver_email: receiverDetails.email, // Receiver's email
          last_message: lastMessageText,
          last_message_time: lastMessage
            ? lastMessage.timestamp
            : chat.updatedAt,
          unread_count: unreadCount,
        };
      })
    );

    // Filter out null values
    const filteredChats = formattedChats.filter((chat) => chat !== null);

    res.status(200).json(filteredChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res
      .status(500)
      .json({ message: "Error fetching chats", error: error.message });
  }
};

exports.getChatByIdForUser = async (req, res) => {
  const { userId } = req.params; // Ensure userId is provided

  try {
    let chat;

    if (userId) {
      // Case 2: Fetch chat by referenceId if chatId is not provided
      chat = await AdminChat.findOne({
        "participants.participant_id": userId, // Check if user is a participant
      }).exec();

      if (!chat) {
        return res.status(200).json({}); // Return empty response for new chat initiation
      }
    } else {
      return res.status(400).json({
        message:
          "Invalid request. Provide chatId or (referenceId).",
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

exports.getChatByIdForAdmin = async (req, res) => {
  const { chatId } = req.params; // Ensure userId is provided
  const superAdminId = await getSuperAdminId();
  const userId = superAdminId.toString();

  try {
    let chat;

    if (chatId) {
      // Case 1: Fetch chat by chatId
      chat = await AdminChat.findById(chatId).exec();

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
    } else if (referenceId) {
      // Case 2: Fetch chat by referenceId if chatId is not provided
      chat = await AdminChat.findOne({
        referenceId,
        "participants.participant_id": userId, // Check if user is a participant
      }).exec();

      if (!chat) {
        return res.status(200).json({}); // Return empty response for new chat initiation
      }
    } else {
      return res.status(400).json({
        message:
          "Invalid request. Provide chatId or (referenceId).",
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
