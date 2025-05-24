const cron = require("node-cron");
const Booking = require("../models/Booking");
const Property = require("../models/Properties");

// Handle bookings where start date has arrived
const activateOngoingBookings = async () => {
  console.log("🔄 Checking for bookings to activate...");

  try {
    const now = new Date();
    const yemenNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    // Find confirmed bookings where start date has arrived
    const startingBookings = await Booking.find({
      start_date: { $lt: yemenNow },
      status: "confirmed",
    });

    for (const booking of startingBookings) {
      booking.status = "active";
      await booking.save();

      // Mark property as booked
      await Property.findByIdAndUpdate(booking.property_id, {
        is_booked: true,
      });
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
    const yemenNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    // Find ongoing bookings where end date has passed
    const expiredBookings = await Booking.find({
      end_date: { $lt: yemenNow },
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
        await Property.findByIdAndUpdate(booking.property_id, {
          is_booked: false,
        });
      }
    }

    console.log(`✅ Completed ${expiredBookings.length} bookings.`);
  } catch (error) {
    console.error("❌ Error completing bookings:", error);
  }
};

// Disable cancellations for bookings within 72 hours of start date
const updateCancellableBookings = async () => {
  console.log("🔄 Checking for bookings that are nearing the start date...");

  try {
    const now = new Date();
    const yemenNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const cutoffTime = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours from now

    // Find cancellable property bookings
    const propertyBookings = await Booking.find({
      booking_type: "property",
      start_date: { $lte: cutoffTime, $gte: yemenNow },
      is_cancellable: true,
      status: "confirmed",
    });

    // Find cancellable event bookings (only check the first event date)
    const eventBookings = await Booking.find({
      booking_type: "event",
      "event_dates.0.date": { $lte: cutoffTime, $gte: yemenNow }, // Only the first event date
      is_cancellable: true,
      status: "confirmed",
    });

    const allBookings = [...propertyBookings, ...eventBookings];

    for (const booking of allBookings) {
      booking.is_cancellable = false;
      await booking.save();
    }

    console.log(
      `✅ Updated ${allBookings.length} bookings to non-cancellable.`,
    );
  } catch (error) {
    console.error("❌ Error updating cancellable bookings:", error);
  }
};

// Delete bookings with pending status for more than 2 hours
const deleteExpiredPendingBookings = async () => {
  console.log("🔄 Checking for expired pending bookings to delete...");

  try {
    const now = new Date();
    const yemenNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(yemenNow.getTime() - 3 * 60 * 60 * 1000);

    // Find and delete bookings that are pending for more than 2 hours
    const deletedBookings = await Booking.deleteMany({
      status: "pending",
      updated_at: { $lte: twoHoursAgo }, // Created more than 2 hours ago
    });

    console.log(
      `✅ Deleted ${deletedBookings.deletedCount} expired pending bookings.`,
    );
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
  },
);

module.exports = {
  activateOngoingBookings,
  expireCompletedBookings,
  updateCancellableBookings,
  deleteExpiredPendingBookings,
};
