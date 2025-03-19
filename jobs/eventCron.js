const cron = require("node-cron");
const Event = require("../models/Events");

// Function to update event statuses
const updateEventStatuses = async () => {
  console.log("🔄 Checking and updating event statuses...");

  try {
    const now = new Date();

    // 1️⃣ Change "upcoming" → "live" if the event start date has arrived
    const liveEvents = await Event.updateMany(
      { status: "upcoming", start_date: { $lt: now } },
      { status: "live" }
    );
    console.log(`✅ Updated ${liveEvents.modifiedCount} events to "live".`);

    // 2️⃣ Change "live" → "completed" if the event end date has passed
    const completedEvents = await Event.updateMany(
      { status: "live", end_date: { $lt: now } },
      { status: "completed", allow_booking: false } // Also disable booking
    );
    console.log(`✅ Updated ${completedEvents.modifiedCount} events to "completed" and disabled booking.`);

  } catch (error) {
    console.error("❌ Error updating event statuses:", error);
  }
};

// Schedule: Runs every 30 minutes
cron.schedule(
  "*/30 * * * *",
  async () => {
    try {
      console.log("📅 Running scheduled event status update...");
      await updateEventStatuses();
      console.log("✅ Event status update completed.");
    } catch (error) {
      console.error("❌ Error in scheduled event status update:", error);
    }
  },
  {
    timezone: "Asia/Aden",
  }
);

module.exports = { updateEventStatuses };
