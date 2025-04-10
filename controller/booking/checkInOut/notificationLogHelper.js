// utils/notification.js

const Notification = require("../../../models/Notification");

/**
 * Logs check-in/out notifications for both the booking user and the owner (User/Admin)
 */
const sendCheckInOutNotifications = async ({ 
  booking, 
  action, 
  timestamp 
}) => {
  const capitalizedAction = action === "check_in" ? "Check-In" : "Check-Out";
  const formattedTime = new Date(timestamp).toLocaleString();

  const userNotification = new Notification({
    user: booking.user_id,
    notification_type: "Booking",
    reference_id: booking._id,
    title: `${capitalizedAction} Successful`,
    message: `You have successfully ${action.replace('_', ' ')}ed at ${formattedTime}.`,
  });

  const ownerNotification = new Notification({
    user: booking.owner_id,
    notification_type: booking.booking_type === "event" ? "Event" : "Property",
    reference_id: booking[`${booking.booking_type}_id`],
    title: `${capitalizedAction} Alert`,
    message: `A guest has ${action.replace('_', ' ')}ed for your ${booking.booking_type} at ${formattedTime}.`,
  });

  await Promise.all([
    userNotification.save(),
    ownerNotification.save(),
  ]);
};

module.exports = {
  sendCheckInOutNotifications
};
