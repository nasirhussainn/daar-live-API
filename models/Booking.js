const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const generateConfirmationTicket = async function () {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let ticket;
  let exists = true;

  while (exists) {
    ticket = "";
    for (let i = 0; i < 8; i++) {
      ticket += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    exists = await Booking.exists({ confirmation_ticket: ticket });
  }
  
  return ticket;
};

const BookingSchema = new Schema({
  booking_type: {
    type: String,
    enum: ["property", "event"],
    required: true, 
  },

  // Property booking fields
  property_id: { type: Schema.Types.ObjectId, ref: "Property", default: null },

  // Event booking fields
  event_id: { type: Schema.Types.ObjectId, ref: "Event", default: null },
  total_participants: { type: Number, default: 1 },

  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // The one who is booking
  realtor_id: { type: Schema.Types.ObjectId, ref: "User", default: null }, // Only for property bookings

  // Dates field for event bookings
  dates: [
    {
      date: { type: Date, default: null },
      time_slot: { type: String, default: null }, // Optional: Specify morning, afternoon, etc.
    }
  ],

  // Property booking dates (kept for backward compatibility)
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },

  payment_detail: { type: Object },

  confirmation_ticket: {
    type: String,
    unique: true,
  },

  security_deposit: { type: Number },

  is_cancellable: { type: Boolean, default: true },

  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "canceled", "active"],
    default: "pending",
  },

  // Fields for booking on behalf of someone else
  guest_name: { type: String, default: null }, 
  guest_email: { type: String, default: null },
  guest_phone: { type: String, default: null },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Ensure a unique confirmation ticket before saving
BookingSchema.pre("validate", async function (next) {
  if (this.isModified("status") && this.status === "confirmed" && !this.confirmation_ticket) {
    this.confirmation_ticket = await generateConfirmationTicket();
  }
  next();
});

// Create Booking model
const Booking = mongoose.model("Booking", BookingSchema);
module.exports = Booking;
