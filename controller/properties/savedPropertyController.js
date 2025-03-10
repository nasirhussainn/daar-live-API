const SavedProperty = require("../../models/SavedProperty");
const { getRealtorStats } = require("../../controller/stats/getRealtorStats"); // Import the function

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
    let { page, limit } = req.query;

    page = parseInt(page) || 1; // Default page = 1
    limit = parseInt(limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit;

    // Fetch total count of saved properties
    const totalSavedProperties = await SavedProperty.countDocuments({ user_id });

    // Fetch paginated saved properties
    const savedProperties = await SavedProperty.find({ user_id })
      .populate({
        path: "property_id",
        populate: [
          { path: "owner_id" }, // Fetch owner (realtor) details
          { path: "property_type" },
          { path: "property_subtype" },
          { path: "location" },
          { path: "media" },
          { path: "amenities" }
        ],
      })
      .skip(skip)
      .limit(limit);

    if (!savedProperties.length) {
      return res.status(404).json({ message: "No saved properties found" });
    }

    // Get unique realtors (owners) from saved properties
    const uniqueOwners = [...new Set(savedProperties.map(saved => saved.property_id.owner_id.toString()))];

    // Fetch statistics for all unique realtors
    const ownerStats = {};
    for (const ownerId of uniqueOwners) {
      ownerStats[ownerId] = await getRealtorStats(ownerId);
    }

    // Fetch amenities and reviews for each saved property
    const savedPropertiesWithDetails = await Promise.all(
      savedProperties.map(async (saved) => {
        const property = saved.property_id;
        const ownerId = property.owner_id._id.toString(); // Extract owner_id

        const reviewDetails = await Review.find({
          review_for: property._id,
          review_for_type: "Property",
        }).populate("review_by");

        return {
          ...property.toObject(),
          reviews: reviewDetails,
          saved_status: saved.status, // Include saved status ('like' or 'unlike')
          owner_stats: ownerStats[ownerId] || null, // Include statistics for this owner
        };
      })
    );

    res.status(200).json({
      totalSavedProperties,
      currentPage: page,
      totalPages: Math.ceil(totalSavedProperties / limit),
      properties: savedPropertiesWithDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


