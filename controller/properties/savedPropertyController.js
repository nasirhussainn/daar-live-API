const SavedProperty = require("../../models/SavedProperty");
const Property = require("../../models/Properties");
const Review = require("../../models/Review");
const Amenities = require("../../models/admin/Amenities");
const { getRealtorStats } = require("../../controller/stats/getRealtorStats"); // Import the function
const { getReviewsWithCount, getReviewCount } = require("../../controller/reviews/getReviewsWithCount");
const { getAvgRating } = require("../user/getAvgRating");

// @desc Like a property (save property)
// @route POST /api/saved-properties/like
exports.likeProperty = async (req, res) => {
    try {
      const { user_id, property_id } = req.body;
  
      // Check if the property is already saved
      let savedProperty = await SavedProperty.findOne({ user_id, property_id });
  
      if (savedProperty) {
        if (savedProperty.status === "like") {
          return res.status(200).json({ message: "Property already liked.", savedProperty });
        }
  
        // If previously disliked, update status to like
        savedProperty.status = "like";
        await savedProperty.save();
        return res.status(200).json({ message: "Property liked successfully.", savedProperty });
      }
  
      // Save new property like
      savedProperty = new SavedProperty({ user_id, property_id, status: "like" });
      await savedProperty.save();
  
      res.status(201).json({ message: "Property liked (saved) successfully.", savedProperty });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
  

// @desc Dislike a property (remove from saved)
// @route DELETE /api/saved-properties/dislike
exports.dislikeProperty = async (req, res) => {
  try {
    const { user_id, property_id } = req.body;

    // Find and delete the saved property
    const deleted = await SavedProperty.findOneAndDelete({ user_id, property_id });

    if (!deleted) {
      return res.status(404).json({ message: "Property not found in saved list." });
    }

    res.status(200).json({ message: "Property disliked (removed) successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getSavedProperties = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch total saved properties count
    const totalSavedProperties = await SavedProperty.countDocuments({ user_id, status: "like" });

    // Fetch saved property IDs with pagination
    const savedProperties = await SavedProperty.find({ user_id, status: "like" })
      .select("property_id")
      .skip(skip)
      .limit(limit);

    if (!savedProperties.length) {
      return res.status(404).json({ message: "No saved properties found" });
    }

    const propertyIds = savedProperties.map((saved) => saved.property_id);

    // Fetch detailed property data
    const properties = await Property.find({ _id: { $in: propertyIds } })
      .populate({
        path: "owner_id",
        select: "full_name email phone_number profile_picture", 
      })
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .populate("property_type")
      .populate("property_subtype");

    // Process amenities, reviews, saved status, and realtor stats
    const propertiesWithDetails = await Promise.all(
      properties.map(async (property) => {
        const amenitiesDetails = await Amenities.find({ _id: { $in: property.amenities } });
        const reviewData = await getReviewsWithCount(property._id, "Property");

        let savedStatus = "unlike";
        const savedProperty = await SavedProperty.findOne({ user_id, property_id: property._id });
        if (savedProperty) {
          savedStatus = savedProperty.status;
        }

        let realtorStats = null, realtorAvgRating = 0, realtorReviewCount = 0;
        if (property.owner_id) {
          realtorStats = await getRealtorStats(property.owner_id._id);
          realtorAvgRating = await getAvgRating(property.owner_id._id);
          realtorReviewCount = await getReviewCount(property.owner_id._id, "User");
        }

        return {
          ...property.toObject(),
          amenities: amenitiesDetails,
          review: reviewData,
          saved_status: savedStatus,
          realtor_stats: realtorStats,
          realtor_review_count: realtorReviewCount,
          realtor_avg_rating: realtorAvgRating,
        };
      })
    );

    res.status(200).json({
      totalSavedProperties,
      currentPage: page,
      totalPages: Math.ceil(totalSavedProperties / limit),
      properties: propertiesWithDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching saved properties", error: error.message });
  }
};




