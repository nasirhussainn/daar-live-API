const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require("uuid"); // For generating confirmation_ticket

const BookingSchema = new Schema({
  property_id: { type: Schema.Types.ObjectId, ref: "Property", required: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // The one who is booking
  realtor_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // The property owner (realtor)

  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },

  payment_detail: { type: Object, required: true }, // Payment details from Stripe

  confirmation_ticket: {
    type: String,
    default: () => uuidv4(), // Generate a unique ticket ID
    unique: true,
  },

  security_deposit: { type: Number },

  is_cancellable: { type: Boolean, default: true },

  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "canceled"],
    default: "pending", // Default to pending when booking is created
  },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Create Booking model
const Booking = mongoose.model("Booking", BookingSchema);
module.exports = Booking;
