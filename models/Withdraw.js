const mongoose = require("mongoose");
const { Schema } = mongoose;

const withdrawSchema = new Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // The user requesting withdrawal
  amount: { type: Number, required: true, min: 1 }, // Amount to withdraw
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  }, // Status of the withdrawal request
  bank_details: {
    account_holder_name: { type: String, required: true },
    account_number: { type: String, required: true },
    bank_name: { type: String, required: true },
  }, 
  created_at: { type: Date, default: Date.now }, // Timestamp of request
  updated_at: { type: Date, default: Date.now }, // Timestamp of last update
});

const Withdraw = mongoose.model("Withdraw", withdrawSchema);
module.exports = Withdraw;
