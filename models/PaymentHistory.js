const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaymentHistorySchema = new Schema({
  payer_type: {
    type: String,
    enum: ["User", "Realtor"], // Distinguish between who is paying
    required: true,
  },
  payer_id: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: "payer_type", // Dynamically reference "User" or "Realtor"
  },

  recipient_type: {
    type: String,
    enum: ["User", "Realtor", "Admin"], // Who is receiving the payment
    required: true,
  },
  recipient_id: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: "recipient_type",
  },

  transaction_id: { type: String, required: true, unique: true }, // Unique transaction identifier
  amount: { type: Number, required: true }, // Amount paid
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" }, // Payment status
  entity_type: { type: String, enum: ["subscription", "featured_event", "featured_property", "booking_event", "booking_property"], required: true }, // Payment category
  entity_id: { type: Schema.Types.ObjectId, required: true }, // ID of Subscription, Booking, or FeaturedEntity
  created_at: { type: Date, default: Date.now }, // Payment date
});

const PaymentHistory = mongoose.model("PaymentHistory", PaymentHistorySchema);
module.exports = PaymentHistory;
