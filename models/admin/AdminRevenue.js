const mongoose = require("mongoose");

const AdminRevenueSchema = new mongoose.Schema({
    total_revenue: { type: Number, default: 0 }, // Total revenue from all sources

    // Booking revenue breakdown
    admin_booking_revenue: { type: Number, default: 0 }, // Admin’s share from all bookings
    total_booking_revenue: { type: Number, default: 0 }, // Total revenue from all bookings

    // Booking percentage revenue
    total_percentage_revenue: { type: Number, default: 0 }, // Total percentage-based revenue

    // Subscription revenue
    subscription_revenue: { type: Number, default: 0 }, // Revenue from subscriptions

    // Featured listing revenue
    featured_revenue: { type: Number, default: 0 }, // Total featured listing revenue

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

AdminRevenueSchema.pre("save", function (next) {
    this.updated_at = Date.now();
    next();
});

const AdminRevenue = mongoose.model("AdminRevenue", AdminRevenueSchema);
module.exports = AdminRevenue;
