const Booking = require("../../models/Booking"); // Booking model
const User = require("../../models/User"); // User model
const Realtor = require("../../models/Realtor"); // Realtor model
const Settings = require("../../models/admin/Settings"); // Settings model
const AdminRevenue = require("../../models/admin/AdminRevenue"); // AdminRevenue model

const updateRevenue = async (booking_id, isCanceled = false) => {
  try {
    // Find the booking by ID
    const booking = await Booking.findById(booking_id);
    if (!booking) {
      console.error(`Booking with ID ${booking_id} not found.`);
      return { success: false, message: "Booking not found" };
    }

    // Check payment amount
    const amount = booking.payment_detail?.amount || 0;
    const bookingPercentage = await Settings.findOne({}, "booking_percentage").lean();
    const adminPercentage = bookingPercentage?.booking_percentage;
    if (amount <= 0) {
      console.error(`Invalid payment amount for booking ${booking_id}.`);
      return { success: false, message: "Invalid payment amount" };
    }

    // Fetch or create AdminRevenue record
    let adminRevenue = await AdminRevenue.findOne();
    if (!adminRevenue) {
      adminRevenue = new AdminRevenue({});
    }

    // If the booking belongs to the Admin directly
    if (booking.owner_type === "Admin") {
      if (isCanceled) {
        // Deduct from admin’s direct revenue
        adminRevenue.admin_booking_revenue = Math.max((adminRevenue.admin_booking_revenue || 0) - amount, 0);
        adminRevenue.total_booking_revenue = Math.max((adminRevenue.total_booking_revenue || 0) - amount, 0);
      } else {
        // Add to admin’s direct revenue
        adminRevenue.admin_booking_revenue = (adminRevenue.admin_booking_revenue || 0) + amount;
        adminRevenue.total_booking_revenue = (adminRevenue.total_booking_revenue || 0) + amount;
      }

      // Update total revenue
      adminRevenue.total_revenue = Math.max(
        (adminRevenue.total_revenue || 0) + (isCanceled ? -amount : amount),
        0
      );

      await adminRevenue.save();

      console.log(`Updated AdminRevenue for direct admin booking by ${isCanceled ? `-${amount}` : amount}.`);
      return { success: true, message: `Admin revenue ${isCanceled ? "deducted" : "updated"}`, admin_revenue: amount };
    }

    // If the booking belongs to a User (handled by a Realtor)
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

      if (isCanceled) {
        // Deduct from realtor and admin revenue
        realtor.total_revenue = Math.max((realtor.total_revenue || 0) - realtorRevenue, 0);
        realtor.available_revenue = Math.max((realtor.available_revenue || 0) - realtorRevenue, 0);

        adminRevenue.total_booking_revenue = Math.max((adminRevenue.total_booking_revenue || 0) - adminCut, 0);
        adminRevenue.total_percentage_revenue = Math.max((adminRevenue.total_percentage_revenue || 0) - adminCut, 0);
      } else {
        // Add to realtor and admin revenue
        realtor.total_revenue = (realtor.total_revenue || 0) + realtorRevenue;
        realtor.available_revenue = (realtor.available_revenue || 0) + realtorRevenue;

        adminRevenue.total_percentage_revenue = (adminRevenue.total_percentage_revenue || 0) + adminCut;
        adminRevenue.total_booking_revenue = (adminRevenue.total_booking_revenue || 0) + adminCut;
      }

      // Update total revenue
      adminRevenue.total_revenue = Math.max(
        (adminRevenue.total_revenue || 0) + (isCanceled ? -adminCut : adminCut),
        0
      );

      await realtor.save();
      await adminRevenue.save();

      console.log(`Updated Realtor ${realtor._id} revenue by ${isCanceled ? `-${realtorRevenue}` : realtorRevenue}.`);
      console.log(`Updated AdminRevenue for admin’s percentage cut by ${isCanceled ? `-${adminCut}` : adminCut}.`);

      return {
        success: true,
        message: `Total revenue ${isCanceled ? "reversed" : "updated"} successfully`,
        realtor_revenue: realtorRevenue,
        admin_revenue: adminCut,
      };
    }

    console.error(`Invalid owner_type: ${booking.owner_type} for booking ${booking_id}`);
    return { success: false, message: "Invalid owner type" };

  } catch (error) {
    console.error("Error updating revenues:", error);
    return { success: false, message: "Server error", error: error.message };
  }
};

module.exports = updateRevenue;
