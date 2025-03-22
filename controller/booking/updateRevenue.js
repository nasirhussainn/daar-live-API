const Booking = require("../../models/Booking"); // Booking model
const User = require("../../models/User"); // User model
const Realtor = require("../../models/Realtor"); // Realtor model
const Admin = require("../../models/Admin"); // Admin model

const updateRevenue = async (booking_id, adminPercentage = 10) => {
  try {
    // Find the booking by ID
    const booking = await Booking.findById(booking_id);
    if (!booking) {
      console.error(`Booking with ID ${booking_id} not found.`);
      return { success: false, message: "Booking not found" };
    }

    // Check payment amount
    const amount = booking.payment_detail?.amount || 0;
    if (amount <= 0) {
      console.error(`Invalid payment amount for booking ${booking_id}.`);
      return { success: false, message: "Invalid payment amount" };
    }

    // If owner_type is "Admin", update Admin revenue directly
    if (booking.owner_type === "Admin") {
      const admin = await Admin.findById(booking.owner_id);
      if (!admin) {
        console.error(`Admin with ID ${booking.owner_id} not found.`);
        return { success: false, message: "Admin not found" };
      }

      admin.total_revenue = (admin.total_revenue || 0) + amount;
      await admin.save();

      console.log(`Updated Admin ${admin._id} revenue by ${amount}.`);
      return { success: true, message: "Admin revenue updated", admin_revenue: amount };
    }

    // If owner_type is "User", process Realtor and Admin revenue
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

      // Calculate admin deduction
      const adminCut = (amount * adminPercentage) / 100;
      const realtorRevenue = amount - adminCut;

      // Update Realtor revenue
      realtor.total_revenue = (realtor.total_revenue || 0) + realtorRevenue;
      realtor.available_revenue = (realtor.available_revenue || 0) + realtorRevenue;
      await realtor.save();

      console.log(`Updated Realtor ${realtor._id} revenue by ${realtorRevenue}.`);

      // Find Admin with role "super"
      const admin = await Admin.findOne({ role: "super" });
      if (!admin) {
        console.error("No Admin with role 'super' found.");
        return { success: false, message: "Admin with role 'super' not found" };
      }

      // Update Admin revenue
      admin.total_revenue = (admin.total_revenue || 0) + adminCut;
      admin.available_revenue = (admin.total_revenue || 0) + adminCut;
      await admin.save();

      console.log(`Updated Admin ${admin._id} revenue by ${adminCut}.`);

      return {
        success: true,
        message: "Total revenue updated successfully",
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
