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

exports.sendAdminDirectMessage = async (req, res, next, io) => {
  try {
    const { senderId, senderType, text, chatId } = req.body;
    let mediaUrl = null;

    // Ensure senderType is valid
    if (!["User", "Realtor", "Admin"].includes(senderType)) {
      return res
        .status(400)
        .json({
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
      chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
    } else {
      // **Case 2: User/Realtor Sending a Message (First Message or Reply to Admin)**
      const superAdminId = await getSuperAdminId();
      if (!superAdminId) {
        return res.status(400).json({ message: "Super Admin not found" });
      }

      chat = await Chat.findOne({
        referenceId: superAdminId,
        referenceType: "Admin",
        participants: [
          { participant_id: senderId, participant_type: senderType },
          { participant_id: superAdminId, participant_type: "Admin" },
        ],
      });

      if (!chat) {
        // **New chat is created if it doesn't exist**
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
