const Notification = require("../../models/Notification");
const resolveUserType = require("../../services/userTypeResolver"); // adjust path

const sendNotification = async (userId, type, referenceId, title, message) => {
  try {
    const userType = await resolveUserType(userId); // 👈 determine whether User or Admin

    await Notification.create({
      user: userId,
      user_type: userType,
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
