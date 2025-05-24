const mongoose = require("mongoose");

const AdminRevenueSchema = new mongoose.Schema({
  period: { type: String, required: true }, // Format: YYYY-MM-DD
  total_revenue: { type: Number, default: 0 }, // Total revenue for the period

  // Booking revenue breakdown
  admin_booking_revenue: { type: Number, default: 0 },
  total_booking_revenue: { type: Number, default: 0 },

  // Booking percentage revenue
  total_percentage_revenue: { type: Number, default: 0 },

  // Subscription revenue
  subscription_revenue: { type: Number, default: 0 },

  // Featured listing revenue
  featured_revenue: { type: Number, default: 0 },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Auto-update the "updated_at" timestamp
AdminRevenueSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Ensure unique period entries (e.g., one per day/week/month)
AdminRevenueSchema.index({ period: 1 }, { unique: true });

const AdminRevenue = mongoose.model("AdminRevenue", AdminRevenueSchema);
module.exports = AdminRevenue;
