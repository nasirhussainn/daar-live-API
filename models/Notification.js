const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'user_type' // 👈 dynamic reference based on this field
    },
    user_type: {
      type: String,
      required: true,
      enum: ['User', 'Admin'] // 👈 make sure only valid model names are allowed
    },
    
    notification_type: {
      type: String,
      enum: ["Booking", "Review", "Property", "Event", "Chat"], // Type of notification
      required: true,
    },

    reference_id: { type: Schema.Types.ObjectId, refPath: "notification_type", required: false }, 
    // The ID of the related booking, review, property, or event

    title: { type: String, required: true }, // Short title of the notification
    message: { type: String, required: true }, // Description of the notification

    is_read: { type: Boolean, default: false }, // Track if the user has seen the notification

    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;
