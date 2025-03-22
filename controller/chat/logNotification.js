const Notification = require("../../models/Notification");

const logNotification = async (receiverId, senderId, senderType, text, chatId) => {
  try {
    const notification = new Notification({
      user: receiverId,
      notification_type: "Chat",
      reference_id: chatId,
      title: `New message from ${senderType}`,
      message: text.length > 50 ? text.substring(0, 50) + "..." : text, // Limit message preview
      is_read: false,
    });

    await notification.save();
  } catch (error) {
    console.error("Error logging notification:", error);
  }
};

module.exports = logNotification