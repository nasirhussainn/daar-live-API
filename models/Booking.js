const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const generateConfirmationTicket = async function () {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let ticket;
  let exists = true;

  while (exists) {
    ticket = "";
    for (let i = 0; i < 6; i++) {
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
  },

  // Property booking fields
  property_id: { type: Schema.Types.ObjectId, ref: "Property", default: null },

  // Slots for properties that charge per hour
  slots: [
    {
      start_time: { type: String, default: null }, // Example: "10:00 AM"
      end_time: { type: String, default: null }, // Example: "12:00 PM"
    },
  ],

  // Event booking fields
  event_id: { type: Schema.Types.ObjectId, ref: "Event", default: null },

  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // The one who is booking

  // Owner details (Either User or Admin)
  owner_type: {
    type: String,
    enum: ["User", "Admin"], // Defines whether the owner is an admin or a user
    required: true,
  },
  owner_id: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: "owner_type", // Dynamically references either "User" or "Admin"
  },

  // Dates field for event bookings
  event_dates: [
    {
      date: { type: Date, default: null },
    },
  ],

  // Property booking dates (kept for backward compatibility)
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },

  payment_detail: { type: Object },

  confirmation_ticket: {
    type: String,
    unique: true,
    sparse: true, 
  },

  security_deposit: { type: Number },

  is_cancellable: { type: Boolean, default: true },

  cancelation_reason: { type: String, default: null },

  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "canceled", "active"],
    default: "pending",
  },

  // Fields for booking on behalf of someone else
  guest_name: { type: String, default: null },
  guest_email: { type: String, default: null },
  guest_phone: { type: String, default: null },

  number_of_tickets: { type: Number, default: 1 },

  // Tickets object (For event bookings)
  tickets: [
    {
      ticket_id: {
        type: String,
        default: null,
        unique: function () {
          return this.booking_type === "event"; // Ensure uniqueness only for event bookings
        },
        sparse: true,
      },
      status: { type: String, enum: ["valid", "used", "canceled"], default: "valid" },
    },
  ],

  admin_percentage: { type: Number, default: 0 },

  id_number: { type: String, default: null },

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
