const mongoose = require("mongoose");
const Event = require("../../models/Events");
const Booking = require("../../models/Booking");
const Realtor = require("../../models/Realtor"); // Assuming the Host model contains revenue fields

const getHostsStats = async (hostId) => {
  try {
    if (!hostId) return null;

    const hostObjectId = new mongoose.Types.ObjectId(hostId);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [currentHosted, totalHosted, ticketData, hostData] = await Promise.all([
      // Events hosted in the last month
      Event.countDocuments({ host_id: hostObjectId, created_at: { $gte: oneMonthAgo } }),

      // Total events hosted by the user
      Event.countDocuments({ host_id: hostObjectId }),

      // Total tickets sold
      Booking.aggregate([
        {
          $match: {
            event_id: { $ne: null }, // Ensure it's an event booking
            realtor_id: hostObjectId, // Host is the one who organized the event
            status: { $in: ["active", "completed", "confirmed"] },
          },
        },
        {
          $group: {
            _id: null,
            totalTicketsSold: { $sum: "$number_of_tickets" },
          },
        },
      ]),

      // Fetch total and available revenue from the Host model
      Realtor.findOne({ user_id: hostObjectId }).select("total_revenue available_revenue").lean(),
    ]);

    return {
      currentHosted,
      totalHosted,
      totalTicketsSold: ticketData.length > 0 ? ticketData[0].totalTicketsSold : 0,
      totalRevenue: hostData?.total_revenue || 0,
      availableRevenue: hostData?.available_revenue || 0,
    };
  } catch (error) {
    console.error("Error fetching host stats:", error);
    return null;
  }
};

module.exports = { getHostsStats };
