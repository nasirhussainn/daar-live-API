const mongoose = require("mongoose");
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
  productId: { type: String, required: true },
  realtor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Realtor",
    required: true,
  },
  subscription_id: { type: String, required: true },
  customer_id: { type: String, required: true },
  plan_details: {
    // Storing the full plan object
    type: Object,
    required: true,
  },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  status: {
    type: String,
    enum: ["active", "inactive", "pending", "canceled"],
    default: "active",
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);
module.exports = Subscription;
