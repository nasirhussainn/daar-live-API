const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const generateConfirmationTicket = async function () {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
  while (true) {
    let ticket = "";
    for (let i = 0; i < 8; i++) {
      ticket += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if ticket already exists in the database
    const existingBooking = await Booking.findOne({ confirmation_ticket: ticket });
    if (!existingBooking) {
      return ticket; // If unique, return it
    }
  }
};

const BookingSchema = new Schema({
  property_id: { type: Schema.Types.ObjectId, ref: "Property", required: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // The one who is booking
  realtor_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // The property owner (realtor)

  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },

  payment_detail: { type: Object, required: true }, // Payment details from Stripe

  confirmation_ticket: {
    type: String,
    unique: true,
  },

  security_deposit: { type: Number },

  is_cancellable: { type: Boolean, default: true },

  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "canceled", "active"],
    default: "pending", // Default to pending when booking is created
  },

  // Fields for booking on behalf of someone else
  guest_name: { type: String, default: null }, 
  guest_email: { type: String, default: null },
  guest_phone: { type: String, default: null },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});


// Ensure a unique confirmation ticket before saving
BookingSchema.pre("save", async function (next) {
  if (!this.confirmation_ticket) {
    this.confirmation_ticket = await generateConfirmationTicket();
  }
  next();
});

// Create Booking model
const Booking = mongoose.model("Booking", BookingSchema);
module.exports = Booking;
