const Notification = require("../../models/Notification");
const resolveUserType = require("../../services/userTypeResolver");
const { translateText } = require("../../services/translateService");

const sendNotification = async (userId, type, referenceId, title, message) => {
  try {
    const userType = await resolveUserType(userId); // 👈 determine whether User or Admin
    translated_title = await translateText(title);
    translated_message = await translateText(message);

    await Notification.create({
      user: userId,
      user_type: userType,
      notification_type: type,
      reference_id: referenceId,
      title: translated_title,
      message: translated_message,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

module.exports = sendNotification;
