const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema(
  {
    productId: { // Stripe Product ID
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    days: {
      type: Number,
      required: true
    },
    months: {
      type: String,
    },
    planName: {
      type: String,
      required: true,
      trim: true
    },
    planDescription: {
      type: Map,
      of: String,
      required: true
    },
    noOfPropertyListing: {
      type: Number,
      required: true
    },
    noOfEventListing: {
      type: Number,
      required: true
    },
    planAmount: {
      type: Number,
      required: true
    }
  },
  { timestamps: true } // Enables createdAt and updatedAt fields
);

const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

module.exports = SubscriptionPlan;
