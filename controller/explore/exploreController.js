const mongoose = require("mongoose");
const Property = require("../../models/Properties");
const Event = require("../../models/Events");
const Location = require("../../models/Location");
const Amenities = require("../../models/admin/Amenities");
const SavedProperty = require("../../models/SavedProperty");
const axios = require("axios");
const { translateText } = require("../../services/translateService");

const { getRealtorStats } = require("../../controller/stats/getRealtorStats"); // Import the function
const { getHostsStats } = require("../stats/getHostStats"); // Import the function
const {
  getReviewsWithCount,
  getReviewCount,
} = require("../../controller/reviews/getReviewsWithCount"); // Import the function
const { getAvgRating } = require("../user/getAvgRating"); // Import the function


// async function getCityFromCoords(lat, lon) {
//   const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Replace with your actual key

//   const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
//     params: {
//       latlng: `${lat},${lon}`,
//       key: apiKey,
//     },
//   });

//   const results = response.data.results;
//   if (!results.length) return null;

//   const addressComponents = results[0].address_components;

//   for (const component of addressComponents) {
//     if (component.types.includes("locality")) {
//       return component.long_name; // usually the city
//     }
//     if (component.types.includes("administrative_area_level_2")) {
//       return component.long_name;
//     }
//   }

//   return null;
// }

// long lat base property
// exports.findNearbyProperties = async (req, res) => {
//   try {
//     const { latitude, longitude, user_id } = req.query;

//     if (!latitude || !longitude) {
//       return res.status(200).json({
//         success: true,
//         message: "Latitude and Longitude are required",
//         totalProperties: 0,
//         properties: [],
//       });
//     }

//     const lat = parseFloat(latitude);
//     const lon = parseFloat(longitude);

//     if (isNaN(lat) || isNaN(lon)) {
//       return res.status(200).json({
//         success: true,
//         message: "Invalid latitude or longitude",
//         totalProperties: 0,
//         properties: [],
//       });
//     }

//     const targetCity = await getCityFromCoords(lat, lon);

//     if (!targetCity) {
//       return res.status(200).json({
//         success: true,
//         message: "Could not determine city from coordinates",
//         totalProperties: 0,
//         properties: [],
//       });
//     }

//     const allProperties = await Property.find({})
//       .populate({
//         path: "owner_id",
//         select: "email full_name phone_number profile_picture",
//       })
//       .populate("location")
//       .populate("media")
//       .populate("feature_details")
//       .populate("property_type")
//       .populate("property_subtype")
//       .lean();

//     const matchedProperties = [];

//     for (const property of allProperties) {
//       if (property.city !== null) {
//         // const loc = property.location;
//         // let propertyCity = await getCityFromCoords(loc.latitude, loc.longitude);
//         let propertyCity = property.city.en;
//         if (
//           propertyCity &&
//           propertyCity.trim().toLowerCase() === targetCity.trim().toLowerCase()
//         ) {
//           matchedProperties.push(property);
//         }
//       }
//     }

//     const propertiesWithDetails = await Promise.all(
//       matchedProperties.map(async (property) => {
//         const amenitiesDetails = await Amenities.find({
//           _id: { $in: property.amenities },
//         });

//         const reviewData = await getReviewsWithCount(property._id, "Property");

//         let savedStatus = "unlike";

//         if (user_id) {
//           const savedProperty = await SavedProperty.findOne({
//             user_id,
//             property_id: property._id,
//           });

//           if (savedProperty) {
//             savedStatus = savedProperty.status;
//           }
//         }

//         let realtorStats = null;
//         let realtorAvgRating = null;
//         let reatorReviewCount = null;

//         if (property.owner_id) {
//           realtorStats = await getRealtorStats(property.owner_id._id);
//           realtorAvgRating = await getAvgRating(property.owner_id._id);
//           reatorReviewCount = await getReviewCount(
//             property.owner_id._id,
//             "User"
//           );
//         }

//         return {
//           ...property,
//           amenities: amenitiesDetails,
//           review: reviewData,
//           saved_status: savedStatus,
//           realtor_stats: realtorStats,
//           realtor_review_count: reatorReviewCount,
//           realtor_avg_rating: realtorAvgRating,
//         };
//       })
//     );

//     res.status(200).json({
//       success: true,
//       message: `Properties in city: ${targetCity}`,
//       totalProperties: propertiesWithDetails.length,
//       properties: propertiesWithDetails,
//     });
//   } catch (error) {
//     console.error("Error in findNearbyProperties:", error.message); // Optional for debugging
//     res.status(200).json({
//       success: true,
//       message: "No properties found due to an error",
//       totalProperties: 0,
//       properties: [],
//     });
//   }
// };

exports.findNearbyProperties = async (req, res) => {
  try {
    let { latitude, longitude, maxDistance = 30, page, limit, user_id } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    maxDistance = parseFloat(maxDistance); // make sure it's number
    const skip = (page - 1) * limit;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    const maxDistanceInMeters = maxDistance * 1000; // 30 km → 30000 meters

    // Step 1: Find nearby locations
    const nearbyLocations = await Location.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "distance",
          maxDistance: parseFloat(maxDistanceInMeters),
          spherical: true,
        },
      },
    ]);

    if (!nearbyLocations.length) {
      return res.status(200).json({
        success: true,
        totalProperties: 0,
        currentPage: page,
        totalPages: 0,
        properties: [],
      });
    }

    const locationIds = nearbyLocations.map((loc) => loc._id);

    // Step 2: Find total properties
    const totalProperties = await Property.countDocuments({
      location: { $in: locationIds },
    });

    // Step 3: Find properties for this page
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
      .skip(skip)
      .limit(limit)
      .lean();

    // Step 4: Add amenities, reviews, saved status, realtor stats (same as blueprint)
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

        const { unique_views, ...propertyWithoutUniqueViews } = property;
        return {
          ...propertyWithoutUniqueViews,
          amenities: amenitiesDetails,
          review: reviewData,
          saved_status: savedStatus,
          realtor_stats: realtorStats,
          realtor_review_count: realtorReviewCount,
          realtor_avg_rating: realtorAvgRating,
        };
      })
    );

    // Step 5: Send the final response
    return res.status(200).json({
      success: true,
      totalProperties,
      currentPage: page,
      totalPages: Math.ceil(totalProperties / limit),
      properties: propertiesWithDetails,
    });
  } catch (error) {
    console.error("Error finding nearby properties:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.findNearbyEvents = async (req, res) => {
  try {
    let { latitude, longitude, maxDistance = 30, page, limit } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and Longitude are required" });
    }

    const maxDistanceInMeters = maxDistance * 1000; // 30 km → 30000 meters

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    // First find nearby locations
    const nearbyLocations = await Location.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)], // [lng, lat]
          },
          distanceField: "distance",
          maxDistance: parseFloat(maxDistanceInMeters), // in meters
          spherical: true,
        },
      },
    ]);

    if (!nearbyLocations.length) {
      return res.status(200).json({ message: "No nearby events found", events: [] });
    }

    // Extract nearby location IDs
    const locationIds = nearbyLocations.map((loc) => loc._id);

    // Query events with those location IDs
    const query = { location: { $in: locationIds } };

    const totalEvents = await Event.countDocuments(query);

    const events = await Event.find(query)
      .populate({
        path: "host_id",
        select: "email full_name phone_number profile_picture",
      })
      .populate("event_type")
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .skip(skip)
      .limit(limit)
      .lean();

    if (!events.length) {
      return res.status(404).json({ message: "No nearby events found" });
    }

    // Get unique hosts
    const uniqueHosts = [
      ...new Set(events.map((event) => event.host_id._id.toString())),
    ];

    // Fetch statistics for each host
    const hostStats = {};
    const hostAvgRating = {};
    const hostReviewCount = {};
    for (const hostId of uniqueHosts) {
      hostStats[hostId] = await getHostsStats(hostId);
      hostAvgRating[hostId] = await getAvgRating(hostId);
      hostReviewCount[hostId] = await getReviewCount(hostId, "User");
    }

    // Attach reviews and host stats to each event
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const reviews = await getReviewsWithCount(event._id, "Event");

        return {
          ...event,
          reviews,
          host_stats: hostStats[event.host_id._id.toString()] || null,
          host_review_count:
            hostReviewCount[event.host_id._id.toString()] || null,
          host_avg_rating: hostAvgRating[event.host_id._id.toString()] || null,
        };
      })
    );

    return res.status(200).json({
      totalEvents,
      currentPage: page,
      totalPages: Math.ceil(totalEvents / limit),
      events: eventsWithDetails,
    });

  } catch (error) {
    console.error("Error finding nearby events:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};



