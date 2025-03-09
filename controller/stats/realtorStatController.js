const Property = require("../../models/Properties");
const Booking = require("../../models/Booking");

const getRealtorStats = async (req, res) => {
  try {
    const realtorId = req.params.realtorId; // Get realtor ID from request params

    if (!realtorId) {
      return res
        .status(400)
        .json({ success: false, message: "Realtor ID is required" });
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [currentListed, allListed, soldProperties, rentedData] =
      await Promise.all([
        // Count properties listed in the last month
        Property.countDocuments({
          owner_id: realtorId,
          created_at: { $gte: oneMonthAgo },
        }),

        // Count all properties listed by the realtor
        Property.countDocuments({ owner_id: realtorId }),

        // Get sold properties and sum their prices
        Property.aggregate([
          { $match: { owner_id: realtorId, property_status: "sold" } },
          {
            $group: {
              _id: null,
              totalSoldRevenue: { $sum: { $toDouble: "$price" } },
              count: { $sum: 1 }, // Add count of sold properties
            },
          },
        ]),

        // Find rented bookings where the property is for rent and sum revenue
        Booking.aggregate([
          {
            $match: {
              realtor_id: realtorId,
              status: { $in: ["active", "completed"] }, // Include both active and completed bookings
            },
          },
          {
            $lookup: {
              from: "properties",
              localField: "property_id",
              foreignField: "_id",
              as: "property",
            },
          },
          { $unwind: "$property" },
          { $match: { "property.property_purpose": "rent" } },
          {
            $group: {
              _id: null,
              rentedCount: { $sum: 1 },
              rentedRevenue: { $sum: { $toDouble: "$payment_detail.amount" } },
            },
          },
        ]),
      ]);

    // Debugging logs
    console.log("Sold Properties:", soldProperties);
    console.log("Rented Data:", rentedData);

    const totalSoldRevenue =
      soldProperties.length > 0 ? soldProperties[0].totalSoldRevenue : 0;
    const rentedCount = rentedData.length > 0 ? rentedData[0].rentedCount : 0;
    const rentedRevenue =
      rentedData.length > 0 ? rentedData[0].rentedRevenue : 0;

    return res.status(200).json({
      success: true,
      currentListed,
      allListed,
      sold: soldProperties.length > 0 ? soldProperties[0].count : 0, // Corrected sold count
      rented: rentedCount,
      totalRevenue: totalSoldRevenue + rentedRevenue, // Total Revenue (Sold + Rented)
      soldRevenue: totalSoldRevenue,
      rentedRevenue: rentedRevenue,
    });
  } catch (error) {
    console.error("Error fetching realtor stats:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = { getRealtorStats };