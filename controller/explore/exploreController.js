const Property = require("../../models/Properties");
const Event = require("../../models/Events");
const Location = require("../../models/Location");

exports.findNearbyProperties = async (req, res) => {
  try {
    const { latitude, longitude, user_id } = req.query;
    const maxDistance = 15000; // 15 km in meters

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Invalid latitude or longitude values" });
    }

    // Find nearby locations
    const nearbyLocations = await Location.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "distance",
          maxDistance: maxDistance,
          spherical: true,
        },
      },
      { $project: { _id: 1 } },
    ]);

    const locationIds = nearbyLocations.map((loc) => loc._id);

    // Get properties with those location IDs
    const properties = await Property.find({ location: { $in: locationIds } })
      .populate({
        path: "owner_id",
        select: "email full_name phone_number profile_picture",
      })
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .populate("property_type")
      .populate("property_subtype")
      .lean();

    // Enrich property data as done in getAllProperties
    const propertiesWithDetails = await Promise.all(
      properties.map(async (property) => {
        const amenitiesDetails = await Amenities.find({
          _id: { $in: property.amenities },
        });

        const reviewData = await getReviewsWithCount(property._id, "Property");

        let savedStatus = "unlike";
        if (user_id) {
          const savedProperty = await SavedProperty.findOne({
            user_id,
            property_id: property._id,
          });

          if (savedProperty) {
            savedStatus = savedProperty.status;
          }
        }

        let realtorStats = null;
        let realtorAvgRating = null;
        let realtorReviewCount = null;

        if (property.owner_id) {
          realtorStats = await getRealtorStats(property.owner_id._id);
          realtorAvgRating = await getAvgRating(property.owner_id._id);
          realtorReviewCount = await getReviewCount(property.owner_id._id, "User");
        }

        return {
          ...property,
          amenities: amenitiesDetails,
          review: reviewData,
          saved_status: savedStatus,
          realtor_stats: realtorStats,
          realtor_review_count: realtorReviewCount,
          realtor_avg_rating: realtorAvgRating,
        };
      })
    );

    return res.status(200).json({
      totalProperties: propertiesWithDetails.length,
      currentPage: 1,
      totalPages: 1,
      properties: propertiesWithDetails,
    });
  } catch (error) {
    console.error("Error finding nearby properties:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};



exports.findNearbyEvents = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    const maxDistance = 15000; // 15 km in meters

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Invalid latitude or longitude values" });
    }

    // First, find nearby locations
    const nearbyLocations = await Location.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] }, // MongoDB requires [lng, lat]
          distanceField: "distance",
          maxDistance: maxDistance, // Distance in meters
          spherical: true,
        },
      },
      { $project: { _id: 1 } }, // Only return location IDs
    ]);

    // Extract location IDs
    const locationIds = nearbyLocations.map((loc) => loc._id);

    // Find events linked to those locations
    const nearbyEvents = await Event.find({ location: { $in: locationIds } })
    .populate({
      path: "host_id",
      select: "email full_name phone_number profile_picture", // Fetch only these fields
    })
    .populate("event_type")
    .populate("location")
    .populate("media")
    .populate("feature_details")

    return res.status(200).json({ success: true, events: nearbyEvents });
  } catch (error) {
    console.error("Error finding nearby events:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

