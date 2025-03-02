const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  duration: {
    type: Number, 
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  price_id: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

module.exports = SubscriptionPlan;
