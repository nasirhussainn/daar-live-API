const mongoose = require("mongoose");
const Property = require("../../models/Properties");
const Event = require("../../models/Events");
const Location = require("../../models/Location");
const Amenities = require("../../models/admin/Amenities");
const SavedProperty = require("../../models/SavedProperty");
const axios = require("axios");
const { translateText } = require("../../services/translateService");
const Haversine = require('haversine');

const { getRealtorStats } = require("../../controller/stats/getRealtorStats"); // Import the function
const { getHostsStats } = require("../stats/getHostStats"); // Import the function
const {
  getReviewsWithCount,
  getReviewCount,
} = require("../../controller/reviews/getReviewsWithCount"); // Import the function
const { getAvgRating } = require("../user/getAvgRating"); // Import the function

// Function to calculate distance between two lat-lon points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const start = { latitude: lat1, longitude: lon1 };
  const end = { latitude: lat2, longitude: lon2 };
  
  // Return the distance in kilometers
  return Haversine(start, end) ? Haversine(start, end).km : 0;
};

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

// long lat base event
// exports.findNearbyEvents = async (req, res) => {
//   try {
//     const { latitude, longitude } = req.query;

//     if (!latitude || !longitude) {
//       return res.status(200).json({
//         success: true,
//         message: "Latitude and Longitude are required",
//         totalEvents: 0,
//         events: [],
//       });
//     }

//     const lat = parseFloat(latitude);
//     const lon = parseFloat(longitude);

//     if (isNaN(lat) || isNaN(lon)) {
//       return res.status(200).json({
//         success: true,
//         message: "Invalid latitude or longitude values",
//         totalEvents: 0,
//         events: [],
//       });
//     }

//     const userCity = await getCityFromCoords(lat, lon);

//     if (!userCity) {
//       return res.status(200).json({
//         success: true,
//         message: "Could not determine city from coordinates",
//         totalEvents: 0,
//         events: [],
//       });
//     }

//     const allEvents = await Event.find({})
//       .populate({
//         path: "host_id",
//         select: "email full_name phone_number profile_picture",
//       })
//       .populate("event_type")
//       .populate("location")
//       .populate("media")
//       .populate("feature_details")
//       .lean();

//     const matchedEvents = [];

//     for (const event of allEvents) {
//       if (event.city !== null) {
//         let eventCity = event.city.en;
//         // const loc = event.location;
//         // let eventCity = await getCityFromCoords(loc.latitude, loc.longitude);
//         if (
//           eventCity &&
//           eventCity.trim().toLowerCase() === userCity.trim().toLowerCase()
//         ) {
//           matchedEvents.push(event);
//         }
//       }
//     }

//     if (!matchedEvents.length) {
//       return res.status(200).json({
//         success: true,
//         message: `No events found in city: ${userCity}`,
//         totalEvents: 0,
//         events: [],
//       });
//     }

//     const uniqueHosts = [
//       ...new Set(matchedEvents.map((event) => event.host_id._id.toString())),
//     ];

//     const hostStats = {};
//     const hostAvgRating = {};
//     const hostReviewCount = {};
//     for (const hostId of uniqueHosts) {
//       hostStats[hostId] = await getHostsStats(hostId);
//       hostAvgRating[hostId] = await getAvgRating(hostId);
//       hostReviewCount[hostId] = await getReviewCount(hostId, "User");
//     }

//     const enrichedEvents = await Promise.all(
//       matchedEvents.map(async (event) => {
//         const reviews = await getReviewsWithCount(event._id, "Event");

//         return {
//           ...event,
//           reviews,
//           host_stats: hostStats[event.host_id._id.toString()] || null,
//           host_review_count:
//             hostReviewCount[event.host_id._id.toString()] || null,
//           host_avg_rating: hostAvgRating[event.host_id._id.toString()] || null,
//         };
//       })
//     );

//     res.status(200).json({
//       success: true,
//       message: `Events in city: ${userCity}`,
//       totalEvents: enrichedEvents.length,
//       events: enrichedEvents,
//     });
//   } catch (error) {
//     console.error("Error finding events by city:", error);
//     res.status(200).json({
//       success: true,
//       message: "No events found due to internal error",
//       totalEvents: 0,
//       events: [],
//     });
//   }
// };


// max radius base property

exports.findNearbyProperties = async (req, res) => {
  try {
    const { latitude, longitude, user_id, max_radius = 10 } = req.query; // max_radius in kilometers

    if (!latitude || !longitude) {
      return res.status(200).json({
        success: true,
        message: "Latitude and Longitude are required",
        totalProperties: 0,
        properties: [],
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(200).json({
        success: true,
        message: "Invalid latitude or longitude",
        totalProperties: 0,
        properties: [],
      });
    }

    const allProperties = await Property.find({})
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

    const matchedProperties = [];

    for (const property of allProperties) {
      if (property.location && property.location.latitude && property.location.longitude) {
        const propertyLat = property.location.latitude;
        const propertyLon = property.location.longitude;

        // Calculate the distance between the user and the property
        const distance = calculateDistance(lat, lon, propertyLat, propertyLon);

        // Only consider properties within the max radius
        if (distance <= max_radius) {
          matchedProperties.push(property);
        }
      }
    }

    const propertiesWithDetails = await Promise.all(
      matchedProperties.map(async (property) => {
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
        let reatorReviewCount = null;

        if (property.owner_id) {
          realtorStats = await getRealtorStats(property.owner_id._id);
          realtorAvgRating = await getAvgRating(property.owner_id._id);
          reatorReviewCount = await getReviewCount(
            property.owner_id._id,
            "User"
          );
        }

        return {
          ...property,
          amenities: amenitiesDetails,
          review: reviewData,
          saved_status: savedStatus,
          realtor_stats: realtorStats,
          realtor_review_count: reatorReviewCount,
          realtor_avg_rating: realtorAvgRating,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: `Properties within ${max_radius} km radius`,
      totalProperties: propertiesWithDetails.length,
      properties: propertiesWithDetails,
    });
  } catch (error) {
    console.error("Error in findNearbyProperties:", error.message); // Optional for debugging
    res.status(200).json({
      success: true,
      message: "No properties found due to an error",
      totalProperties: 0,
      properties: [],
    });
  }
};

// max radius base event
exports.findNearbyEvents = async (req, res) => {
  try {
    const { latitude, longitude, max_radius = 10 } = req.query; // max_radius in kilometers

    if (!latitude || !longitude) {
      return res.status(200).json({
        success: true,
        message: "Latitude and Longitude are required",
        totalEvents: 0,
        events: [],
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(200).json({
        success: true,
        message: "Invalid latitude or longitude values",
        totalEvents: 0,
        events: [],
      });
    }

    const allEvents = await Event.find({})
      .populate({
        path: "host_id",
        select: "email full_name phone_number profile_picture",
      })
      .populate("event_type")
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .lean();

    const matchedEvents = [];

    for (const event of allEvents) {
      if (event.location && event.location.latitude && event.location.longitude) {
        const eventLat = event.location.latitude;
        const eventLon = event.location.longitude;

        // Calculate the distance between the user and the event
        const distance = calculateDistance(lat, lon, eventLat, eventLon);

        // Only consider events within the max radius
        if (distance <= max_radius) {
          matchedEvents.push(event);
        }
      }
    }

    if (!matchedEvents.length) {
      return res.status(200).json({
        success: true,
        message: `No events found within ${max_radius} km radius`,
        totalEvents: 0,
        events: [],
      });
    }

    const uniqueHosts = [
      ...new Set(matchedEvents.map((event) => event.host_id._id.toString())),
    ];

    const hostStats = {};
    const hostAvgRating = {};
    const hostReviewCount = {};
    for (const hostId of uniqueHosts) {
      hostStats[hostId] = await getHostsStats(hostId);
      hostAvgRating[hostId] = await getAvgRating(hostId);
      hostReviewCount[hostId] = await getReviewCount(hostId, "User");
    }

    const enrichedEvents = await Promise.all(
      matchedEvents.map(async (event) => {
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

    res.status(200).json({
      success: true,
      message: `Events within ${max_radius} km radius`,
      totalEvents: enrichedEvents.length,
      events: enrichedEvents,
    });
  } catch (error) {
    console.error("Error finding events by location:", error);
    res.status(200).json({
      success: true,
      message: "No events found due to internal error",
      totalEvents: 0,
      events: [],
    });
  }
};



