const sendNotification = require("../../notification/sendNotification"); // adjust the path as needed

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

  const userTitle = `${capitalizedAction} Successful`;
  const userMessage = `You have successfully ${action.replace('_', ' ')}ed at ${formattedTime}.`;

  const ownerTitle = `${capitalizedAction} Alert`;
  const ownerMessage = `A guest has ${action.replace('_', ' ')}ed for your ${booking.booking_type} at ${formattedTime}.`;

  const ownerType = booking.booking_type === "event" ? "Event" : "Property";

  await Promise.all([
    sendNotification(
      booking.user_id,
      "Booking",
      booking._id,
      userTitle,
      userMessage
    ),
    sendNotification(
      booking.owner_id,
      ownerType,
      booking[`${booking.booking_type}_id`],
      ownerTitle,
      ownerMessage
    )
  ]);
};

module.exports = {
  sendCheckInOutNotifications
};
