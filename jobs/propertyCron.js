const cron = require("node-cron");
const Booking = require("../models/Booking");
const Property = require("../models/Properties");

// Handle bookings where start date has arrived
const activateOngoingBookings = async () => {
  console.log("🔄 Checking for bookings to activate...");

  try {
    const now = new Date();

    // Find confirmed bookings where start date has arrived
    const startingBookings = await Booking.find({
      start_date: { $lte: now },
      status: "confirmed",
    });

    for (const booking of startingBookings) {
      booking.status = "active";
      await booking.save();

      // Mark property as booked
      await Property.findByIdAndUpdate(booking.property_id, { is_booked: true });
    }

    console.log(`✅ Activated ${startingBookings.length} bookings.`);
  } catch (error) {
    console.error("❌ Error activating bookings:", error);
  }
};

// Handle bookings where end date has passed
const expireCompletedBookings = async () => {
  console.log("🔄 Checking for bookings to complete...");

  try {
    const now = new Date();

    // Find ongoing bookings where end date has passed
    const expiredBookings = await Booking.find({
      end_date: { $lt: now },
      status: "active",
    });

    for (const booking of expiredBookings) {
      booking.status = "completed";
      await booking.save();

      // Check if any other active booking exists for the property
      const activeBooking = await Booking.findOne({
        property_id: booking.property_id,
        status: { $in: ["confirmed", "active"] },
      });

      if (!activeBooking) {
        await Property.findByIdAndUpdate(booking.property_id, { is_booked: false });
      }
    }

    console.log(`✅ Completed ${expiredBookings.length} bookings.`);
  } catch (error) {
    console.error("❌ Error completing bookings:", error);
  }
};

// Disable cancellations for bookings within 48 hours of start date
const updateCancellableBookings = async () => {
  console.log("🔄 Checking for bookings that are nearing the start date...");

  try {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

    // Find bookings that are still cancellable but will start in less than 48 hours
    const cancellableBookings = await Booking.find({
      start_date: { $lt: cutoffTime, $gte: now }, // Start date is within the next 48 hours
      is_cancellable: true, // Still cancellable
      status: "confirmed", // Not yet active
    });

    for (const booking of cancellableBookings) {
      booking.is_cancellable = false;
      await booking.save();
    }

    console.log(`✅ Updated ${cancellableBookings.length} bookings to non-cancellable.`);
  } catch (error) {
    console.error("❌ Error updating cancellable bookings:", error);
  }
};

// Schedule: Runs every 30 minutes
cron.schedule("*/30 * * * *", async () => {
  try {
    console.log("🏠 Running property-related scheduled tasks...");
    await activateOngoingBookings();
    await expireCompletedBookings();
    await updateCancellableBookings();
    console.log("✅ Property-related scheduled tasks completed.");
  } catch (error) {
    console.error("❌ Error in property-related scheduled tasks:", error);
  }
}, {
  timezone: "Asia/Aden",
});

// Delete bookings with pending status for more than 2 hours
const deleteExpiredPendingBookings = async () => {
  console.log("🔄 Checking for expired pending bookings to delete...");

  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

    // Find and delete bookings that are pending for more than 2 hours
    const deletedBookings = await Booking.deleteMany({
      status: "pending",
      updatedAt: { $lt: twoHoursAgo }, // Created more than 2 hours ago
    });

    console.log(`✅ Deleted ${deletedBookings.deletedCount} expired pending bookings.`);
  } catch (error) {
    console.error("❌ Error deleting expired pending bookings:", error);
  }
};

// Schedule: Runs every 30 minutes
cron.schedule(
  "*/30 * * * *",
  async () => {
    try {
      console.log("🏠 Running property-related scheduled tasks...");
      await activateOngoingBookings();
      await expireCompletedBookings();
      await updateCancellableBookings();
      await deleteExpiredPendingBookings();
      console.log("✅ Property-related scheduled tasks completed.");
    } catch (error) {
      console.error("❌ Error in property-related scheduled tasks:", error);
    }
  },
  {
    timezone: "Asia/Aden",
  }
);

module.exports = {
  activateOngoingBookings,
  expireCompletedBookings,
  updateCancellableBookings,
  deleteExpiredPendingBookings,
};

