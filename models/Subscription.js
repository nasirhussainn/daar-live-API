const mongoose = require('mongoose');
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
  realtor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Realtor', required: true }, // Link to the Realtor model
  subscription_id: { type: String, required: true }, // Unique subscription ID
  customer_id: { type: String, required: true }, // Unique customer ID for the subscription
  plan_name: { type: String, required: true }, // Name of the subscription plan
  start_date: { type: Date, required: true }, // Subscription start date
  end_date: { type: Date, required: true }, // Subscription end date
  status: { type: String, enum: ['active', 'inactive', 'pending', 'changed'], default: 'active' }, // Subscription status
  created_at: { type: Date, default: Date.now }, // Timestamp of subscription creation
  updated_at: { type: Date, default: Date.now }, // Timestamp of last update
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
