const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const FeaturedEntity = require("./FeaturedEntity"); // Import the new model

const EventSchema = new Schema({
  host_id: {
    type: Schema.Types.ObjectId,
    refPath: "created_by", // Dynamically references 'User' or 'Admin'
    required: true,
  },

  created_by: {
    type: String,
    enum: ["User", "Admin"], // Must match the actual model names
    required: true,
  },

  title: {
    type: Map,
    of: String,
    required: true,
  },
  description: {
    type: Map,
    of: String,
    required: true,
  },

  event_type: [
    { type: Schema.Types.ObjectId, ref: "EventType", required: true },
  ], // Changed to an array
  status: {
    type: String,
    enum: ["upcoming", "completed", "live"],
    required: true,
    default: "upcoming",
  },

  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },

  entry_type: { type: String, enum: ["free", "paid"] },
  entry_price: { type: Number },
  entry_price_YER: { type: Number, required: false },

  location: { type: Schema.Types.ObjectId, ref: "Location" },
  media: { type: Schema.Types.ObjectId, ref: "Media" },
  feature_details: { type: Schema.Types.ObjectId, ref: "FeaturedEntity" },

  country: {
    type: Map,
    of: String,
  },
  state: {
    type: Map,
    of: String,
  },
  city: {
    type: Map,
    of: String,
  },

  is_feature: { type: Boolean, default: false },
  allow_booking: { type: Boolean, default: true },

  avg_rating: { type: Number, default: 0 },

  currency: {
    type: String,
    enum: ["USD", "YER"],
    default: "USD",
  },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Create Event model
const Event = mongoose.model("Event", EventSchema);
module.exports = Event;
