const mongoose = require("mongoose");
const Property = require("../../models/Properties");
const Booking = require("../../models/Booking");

const getRealtorStats = async (req, res) => {
  try {
    const realtorId = req.params.realtorId;

    if (!realtorId) {
      return res
        .status(400)
        .json({ success: false, message: "Realtor ID is required" });
    }

    const realtorObjectId = new mongoose.Types.ObjectId(realtorId);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [currentListed, allListed, soldData, rentedData] = await Promise.all([
      // Properties listed in the last month
      Property.countDocuments({
        owner_id: realtorObjectId,
        created_at: { $gte: oneMonthAgo },
      }),

      // Total properties listed by the realtor
      Property.countDocuments({ owner_id: realtorObjectId }),

      // Sold properties count and total revenue
      Property.aggregate([
        { $match: { owner_id: realtorObjectId, property_status: "sold" } },
        {
          $group: {
            _id: null,
            soldCount: { $sum: 1 },
            soldRevenue: { $sum: { $toDouble: "$price" } },
          },
        },
      ]),

      // Rented properties count and total rental revenue (No $lookup needed)
      Booking.aggregate([
        {
          $match: {
            realtor_id: realtorObjectId,
            status: { $in: ["active", "completed", "confirmed"] }, // Include active & completed rentals
          },
        },
        {
          $group: {
            _id: null,
            rentedCount: { $sum: 1 },
            rentedRevenue: { $sum: { $toDouble: "$payment_detail.amount" } },
          },
        },
      ]),
    ]);

    // Extract values safely
    const soldCount = soldData.length > 0 ? soldData[0].soldCount : 0;
    const soldRevenue = soldData.length > 0 ? soldData[0].soldRevenue : 0;
    const rentedCount = rentedData.length > 0 ? rentedData[0].rentedCount : 0;
    const rentedRevenue = rentedData.length > 0 ? rentedData[0].rentedRevenue : 0;
    
    const totalCount = soldCount + rentedCount; // Total transactions
    const totalRevenue = soldRevenue + rentedRevenue; // Total revenue

    return res.status(200).json({
      success: true,
      currentListed,
      allListed,
      soldCount,
      rentedCount,
      soldRevenue,
      rentedRevenue,
      totalCount,
      totalRevenue,
    });
  } catch (error) {
    console.error("Error fetching realtor stats:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = { getRealtorStats };
