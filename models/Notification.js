const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "user_type", 
    },
    user_type: {
      type: String,
      required: true,
      enum: ["User", "Admin"], 
    },

    notification_type: {
      type: String,
      enum: ["Booking", "Review", "Property", "Event", "Chat", "Account"], 
      required: true,
    },

    reference_id: {
      type: Schema.Types.ObjectId,
      refPath: "notification_type",
      required: false,
    },

    title: { type: Map, of: String, required: true }, 
    message: { type: Map, of: String, required: true }, 

    is_read: { type: Boolean, default: false }, 

    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;
