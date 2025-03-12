const mongoose = require("mongoose");
const Event = require("../../models/Events");
const Booking = require("../../models/Booking");

const getHostsStats = async (req, res) => {
  try {
    const hostId = req.params.hostId;

    if (!hostId) {
      return res.status(400).json({ success: false, message: "Host ID is required" });
    }

    const hostObjectId = new mongoose.Types.ObjectId(hostId);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [currentHosted, totalHosted, ticketData] = await Promise.all([
      Event.countDocuments({ host_id: hostObjectId, created_at: { $gte: oneMonthAgo } }),
      Event.countDocuments({ host_id: hostObjectId }),

      Booking.aggregate([
        {
          $match: {
            event_id: { $ne: null },
            realtor_id: hostObjectId,
            status: { $in: ["active", "completed", "confirmed"] },
          },
        },
        {
          $group: {
            _id: null,
            totalTicketsSold: { $sum: "$number_of_tickets" },
            totalTicketRevenue: { $sum: { $toDouble: "$payment_detail.amount" } },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      currentHosted,
      totalHosted,
      totalTicketsSold: ticketData.length > 0 ? ticketData[0].totalTicketsSold : 0,
      totalTicketRevenue: ticketData.length > 0 ? ticketData[0].totalTicketRevenue : 0,
    });

  } catch (error) {
    console.error("Error fetching host stats:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Ensure it's exported correctly
module.exports = { getHostsStats };
