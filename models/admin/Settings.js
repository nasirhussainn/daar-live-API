const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    contact_email: { type: String, required: true }, // Email for support
    price_per_day: { type: Number, required: true, default: 0 }, // Cost to feature a property/event per day
    booking_percentage: { type: Number, required: true, default: 0 }, // Admin's commission percentage on bookings
    free_trial_days: { type: Number, required: true, default: 0 }, // Free trial duration in days (Admin CRUD)
    free_trial_properties: { type: Number, required: true, default: 0 }, // No. of listings allowed on free trial (Admin CRUD)
    free_trial_events: { type: Number, required: true, default: 0 }, // No. of events allowed on free trial (Admin CRUD)
    days_to_hide_after_expiry: { type: Number, required: true, default: 0 }, // Days after which listings are hidden post-subscription expiry (Admin CRUD)
    yemen_currency: { type: String, required: false }, // Yemen currency rate (Admin CRUD)
    privacy_policy: { type: Map, of: String, required: false },
    terms_and_conditions: { type: Map, of: String, required: false },
    linkedin: { type: String },
    instagram: { type: String },
    facebook: { type: String },
    twitter: { type: String },
    playstore_link: { type: String },
    appstore_link: { type: String },
    phone_no: { type: String },
    location: { type: String },
  },
  { timestamps: true }, // Automatically adds createdAt and updatedAt
);

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;
