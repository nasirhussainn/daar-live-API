const mongoose = require("mongoose");
const Property = require("../../models/Properties");
const Booking = require("../../models/Booking");
const Realtor = require("../../models/Realtor")

const getRealtorStats = async (realtorId) => {
    try {
      if (!realtorId) return null;

      const realtorObjectId = new mongoose.Types.ObjectId(realtorId);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const [currentListed, allListed, soldData, rentedData, realtorData] = await Promise.all([
        Property.countDocuments({
          owner_id: realtorObjectId,
          created_at: { $gte: oneMonthAgo },
        }),
        Property.countDocuments({ owner_id: realtorObjectId }),
        Property.aggregate([
          { $match: { owner_id: realtorObjectId, property_status: "sold" } },
          { $group: { _id: null, soldCount: { $sum: 1 }, soldRevenue: { $sum: { $toDouble: "$price" } } } },
        ]),
        Booking.aggregate([
          {
            $match: {
              owner_id: realtorObjectId,
              status: { $in: ["active", "completed", "confirmed"] },
              property_id: { $ne: null } // Ensure it's a property booking
            }
          },
          {
            $lookup: {
              from: "properties", // Collection name in MongoDB (should be lowercase plural)
              localField: "property_id",
              foreignField: "_id",
              as: "property"
            }
          },
          { $unwind: "$property" },
          {
            $match: {
              "property.property_purpose": "rent"
            }
          },
          {
            $group: {
              _id: null,
              rentedCount: { $sum: 1 },
              rentedRevenue: { $sum: { $toDouble: "$payment_detail.amount" } }
            }
          }
        ]),        
        Realtor.findOne({ user_id: realtorObjectId }).select('total_revenue available_revenue').lean(),
      ]);

      const totalRevenue = realtorData?.total_revenue || 0;
      const availableRevenue = realtorData?.available_revenue || 0;

      return {
        currentListed,
        allListed,
        soldCount: soldData.length > 0 ? soldData[0].soldCount : 0,
        rentedCount: rentedData.length > 0 ? rentedData[0].rentedCount : 0,
        totalRevenue,
        availableRevenue,
      };
    } catch (error) {
      console.error("Error fetching realtor stats:", error);
      return null;
    }
  };

  // Export function
  module.exports = { getRealtorStats };
