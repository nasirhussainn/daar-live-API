const Chat = require("../../models/Chat");
const Admin = require("../../models/Admin");
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

exports.sendAdminDirectMessage1 = async (req, res, next, io) => {
  try {
    const { senderId, senderType, text, chatId, message_type, audio_duration } =
      req.body;
    let mediaUrl = null;

    // Validate senderType
    if (!["User", "Realtor", "Admin"].includes(senderType)) {
      return res.status(400).json({ message: "Invalid senderType" });
    }

    // Validate message_type
    if (!["text", "image", "audio"].includes(message_type)) {
      return res.status(400).json({ message: "Invalid message_type" });
    }

    // Handle media upload if applicable
    if (req.file) {
      mediaUrl = await uploadChatMedia(req.file.buffer, message_type);
    }

    // Validate text or media presence
    if (message_type === "text" && !text) {
      return res.status(400).json({ message: "Text message cannot be empty" });
    }

    if ((message_type === "image" || message_type === "audio") && !mediaUrl) {
      return res.status(400).json({ message: "Media file is required" });
    }

    if (message_type === "audio" && !audio_duration) {
      return res.status(400).json({ message: "Audio duration is required" });
    }

    let chat;

    if (chatId) {
      chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
    } else {
      const superAdminId = await getSuperAdminId();
      if (!superAdminId) {
        return res.status(400).json({ message: "Super Admin not found" });
      }

      chat = await Chat.findOne({
        referenceId: superAdminId,
        referenceType: "Admin",
        participants: {
          $elemMatch: {
            participant_id: senderId,
            participant_type: senderType,
          },
        },
      });

      if (!chat) {
        chat = new Chat({
          referenceId: superAdminId,
          referenceType: "Admin",
          participants: [
            { participant_id: senderId, participant_type: senderType },
            { participant_id: superAdminId, participant_type: "Admin" },
          ],
          messages: [],
          unreadCount: new Map(),
        });
      }
    }

    // Create the message object
    const message = {
      sender_id: senderId,
      sender_type: senderType,
      content: mediaUrl || text,
      message_type,
      audio_duration: audio_duration || null,
      timestamp: new Date(),
      is_read: false,
    };

    chat.messages.push(message);

    // Update unreadCount for the receiver
    chat.participants.forEach((participant) => {
      const participantId = participant.participant_id.toString();
      if (participantId !== senderId) {
        chat.unreadCount.set(
          participantId,
          (chat.unreadCount.get(participantId) || 0) + 1,
        );
      }
    });

    await chat.save();

    // Emit real-time event
    io.to(`chat:${chat._id}`).emit("newMessage", { chatId: chat._id, message });

    res.status(200).json({ message: "Message sent", chat });
  } catch (error) {
    console.error("Error sending direct message:", error);
    res
      .status(500)
      .json({ message: "Error sending message", error: error.message });
  }
};
