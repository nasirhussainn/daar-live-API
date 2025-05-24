const Booking = require("../../models/Booking"); // Booking model
const User = require("../../models/User"); // User model
const Realtor = require("../../models/Realtor"); // Realtor model
const Settings = require("../../models/admin/Settings"); // Settings model
const AdminRevenue = require("../../models/admin/AdminRevenue"); // AdminRevenue model
const { updateAdminRevenue } = require("../../services/updateAdminRevenue"); // AdminRevenue service

const updateRevenue = async (booking_id, isCanceled = false) => {
  try {
    // Find the booking by ID
    const booking = await Booking.findById(booking_id);
    if (!booking) {
      console.error(`Booking with ID ${booking_id} not found.`);
      return { success: false, message: "Booking not found" };
    }

    // Extract booking amount
    const amount = booking.payment_detail?.amount || 0;
    const bookingPercentage = await Settings.findOne(
      {},
      "booking_percentage",
    ).lean();
    const adminPercentage = bookingPercentage?.booking_percentage;
    if (amount <= 0) {
      console.error(`Invalid payment amount for booking ${booking_id}.`);
      return { success: false, message: "Invalid payment amount" };
    }

    // Get the booking date for the period (assuming booking.created_at holds the date)
    const period = booking.created_at.toISOString().split("T")[0]; // Format: YYYY-MM-DD

    if (booking.owner_type === "Admin") {
      const revenueAmount = isCanceled ? -amount : amount;

      // Update admin's direct revenue
      await updateAdminRevenue(revenueAmount, "admin_booking_revenue", period);
      await updateAdminRevenue(revenueAmount, "total_booking_revenue", period);
      await updateAdminRevenue(revenueAmount, "total_revenue", period);

      console.log(
        `Updated AdminRevenue for direct admin booking by ${revenueAmount}.`,
      );
      return {
        success: true,
        message: `Admin revenue ${isCanceled ? "deducted" : "updated"}`,
        admin_revenue: revenueAmount,
      };
    }

    if (booking.owner_type === "User") {
      const user = await User.findById(booking.owner_id);
      if (!user) {
        console.error(`User with ID ${booking.owner_id} not found.`);
        return { success: false, message: "User not found" };
      }

      // Find Realtor by user_id
      const realtor = await Realtor.findOne({ user_id: user._id });
      if (!realtor) {
        console.error(`Realtor with user_id ${user._id} not found.`);
        return { success: false, message: "Realtor not found" };
      }

      // Calculate admin’s cut
      const adminCut = (amount * adminPercentage) / 100;
      const realtorRevenue = amount - adminCut;
      const adminCutAmount = isCanceled ? -adminCut : adminCut;
      const realtorRevenueAmount = isCanceled
        ? -realtorRevenue
        : realtorRevenue;

      // Update Realtor revenue
      realtor.total_revenue =
        (realtor.total_revenue || 0) + realtorRevenueAmount;
      realtor.available_revenue =
        (realtor.available_revenue || 0) + realtorRevenueAmount;
      await realtor.save();

      // Update AdminRevenue
      await updateAdminRevenue(adminCutAmount, "total_booking_revenue", period);
      await updateAdminRevenue(
        adminCutAmount,
        "total_percentage_revenue",
        period,
      );
      await updateAdminRevenue(adminCutAmount, "total_revenue", period);

      console.log(
        `Updated Realtor ${realtor._id} revenue by ${realtorRevenueAmount}.`,
      );
      console.log(
        `Updated AdminRevenue for admin’s percentage cut by ${adminCutAmount}.`,
      );

      return {
        success: true,
        message: `Total revenue ${isCanceled ? "reversed" : "updated"} successfully`,
        realtor_revenue: realtorRevenueAmount,
        admin_revenue: adminCutAmount,
      };
    }

    console.error(
      `Invalid owner_type: ${booking.owner_type} for booking ${booking_id}`,
    );
    return { success: false, message: "Invalid owner type" };
  } catch (error) {
    console.error("Error updating revenues:", error);
    return { success: false, message: "Server error", error: error.message };
  }
};

module.exports = updateRevenue;
