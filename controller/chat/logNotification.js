const sendNotification = require("../notification/sendNotification"); 

const logNotification = async (receiverId, senderId, senderType, text, chatId) => {
  try {
    const title = `New message from ${senderType}`;
    const message = text.length > 50 ? text.substring(0, 50) + "..." : text;

    await sendNotification(
      receiverId,
      "Chat",
      chatId,
      title,
      message
    );
  } catch (error) {
    console.error("Error logging notification:", error);
  }
};

module.exports = logNotification;
