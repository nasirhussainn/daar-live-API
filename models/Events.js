const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    eventStatus: { type: String, enum: ["upcoming", "ongoing", "completed"], required: true },
    eventStartDate: { type: Date, required: true },
    eventEndDate: { type: Date, required: true },
    eventType: [{ type: String, required: true }], // e.g., ["Concert", "Conference"]
    eventStartTime: { type: String, required: true }, // e.g., "18:00"
    eventEndTime: { type: String, required: true }, // e.g., "22:00"
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    entryType: { type: String, enum: ["free", "paid"], required: true },
    entryPrice: { type: Number, default: 0 },
    description: { type: String },
    images: [{ type: String }], // Store image URLs
    video: { type: String }, // Store video URL
    noOfDays: { type: Number, required: true },
    paymentDate: { type: Date },
    isFeature: { type: Boolean, default: false },
    allowBooking: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", EventSchema);
