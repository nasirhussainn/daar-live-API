const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    contact_email: { type: String, required: true }, // Email for support
    price_per_day: { type: Number, required: true, default: 0 }, // Cost to feature a property/event per day
    booking_percentage: { type: Number, required: true, default: 0 }, // Admin's commission percentage on bookings
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;
