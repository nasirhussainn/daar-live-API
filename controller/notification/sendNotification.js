const Notification = require("../../models/Notification"); // Adjust the path based on your project structure

const sendNotification = async (userId, type, referenceId, title, message) => {
  try {
    await Notification.create({
      user: userId,
      notification_type: type,
      reference_id: referenceId,
      title,
      message,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

module.exports = sendNotification;
