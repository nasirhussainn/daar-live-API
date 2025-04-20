const mongoose = require("mongoose");
const Property = require("../../models/Properties");
const Event = require("../../models/Events");
const Location = require("../../models/Location");
const Amenities = require("../../models/admin/Amenities");
const SavedProperty = require("../../models/SavedProperty");
const axios = require("axios");
const { translateText } = require("../../services/translateService");

const { getRealtorStats } = require("../../controller/stats/getRealtorStats"); // Import the function
const {
  getReviewsWithCount,
  getReviewCount,
} = require("../../controller/reviews/getReviewsWithCount"); // Import the function
const { getAvgRating } = require("../user/getAvgRating"); // Import the function

async function getCityFromCoords(lat, lon) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Replace with your actual key

  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    {
      params: {
        latlng: `${lat},${lon}`,
        key: apiKey,
      },
    }
  );

  const results = response.data.results;
  if (!results.length) return null;

  const addressComponents = results[0].address_components;

  for (const component of addressComponents) {
    if (component.types.includes("locality")) {
      return component.long_name; // usually the city
    }
    if (component.types.includes("administrative_area_level_2")) {
      return component.long_name;
    }
  }

  return null;
}

exports.findNearbyProperties = async (req, res) => {
  try {
    const { latitude, longitude, user_id } = req.query;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and Longitude are required" });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    const targetCity = await getCityFromCoords(lat, lon);
    // const targetCityTranslated = await translateText(targetCityOrg);
    // const targetCity = targetCityTranslated.en;

    if (!targetCity) {
      return res
        .status(404)
        .json({ error: "Could not determine city from coordinates" });
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
      // const loc = property.location;
      // if (!loc || !loc.latitude || !loc.longitude) continue;

      // let propertyCity = await getCityFromCoords(loc.latitude, loc.longitude);
      // // const propertyCityTranslated = await translateText(propertyCityOrg);
      // // const propertyCity = propertyCityTranslated.en;
      // console.log(loc.latitude, loc.longitude)
      // console.log(propertyCity, targetCity);
      if (property.city !== null) {
        let propertyCity = property.city.en;
        if (
          propertyCity &&
          propertyCity.trim().toLowerCase() === targetCity.trim().toLowerCase()
        ) {
          matchedProperties.push(property);
        }
      }
    }

    // Enrich matched properties
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
      message: `Properties in city: ${targetCity}`,
      totalProperties: propertiesWithDetails.length,
      properties: propertiesWithDetails,
    });
  } catch (error) {
    console.error("Error in findPropertiesByCity:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching properties by city",
      error: error.message,
    });
  }
};

exports.findNearbyEvents = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Latitude and Longitude are required" });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res
        .status(400)
        .json({ message: "Invalid latitude or longitude values" });
    }

    // Step 1: Get city name from user's coordinates
    const userCity = await getCityFromCoords(lat, lon);
    // const userCityTranslated = await translateText(userCityOrg);
    // const userCity = userCityTranslated.en;

    if (!userCity) {
      return res
        .status(404)
        .json({ message: "Could not determine city from coordinates" });
    }

    // Step 2: Fetch all events
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

    // Step 3: Match events based on city of their location
    for (const event of allEvents) {
      // const loc = event.location;
      // if (!loc || !loc.latitude || !loc.longitude) continue;

      // const eventCity = await getCityFromCoords(loc.latitude, loc.longitude);
      // const eventCityTranslated = await translateText(eventCityOrg);
      // const eventCity = eventCityTranslated.en;
      if (event.city !== null) {
        let eventCity = event.city.en;
        console.log(eventCity, userCity);
        if (
          eventCity &&
          eventCity.trim().toLowerCase() === userCity.trim().toLowerCase()
        ) {
          matchedEvents.push(event);
        }
      }
    }

    if (!matchedEvents.length) {
      return res
        .status(404)
        .json({ message: `No events found in city: ${userCity}` });
    }

    // Step 4: Get unique host IDs
    const uniqueHosts = [
      ...new Set(matchedEvents.map((event) => event.host_id._id.toString())),
    ];

    // Step 5: Fetch host stats
    const hostStats = {};
    const hostAvgRating = {};
    const hostReviewCount = {};
    for (const hostId of uniqueHosts) {
      hostStats[hostId] = await getHostsStats(hostId);
      hostAvgRating[hostId] = await getAvgRating(hostId);
      hostReviewCount[hostId] = await getReviewCount(hostId, "User");
    }

    // Step 6: Attach review and host info
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
      message: `Events in city: ${userCity}`,
      totalEvents: enrichedEvents.length,
      events: enrichedEvents,
    });
  } catch (error) {
    console.error("Error finding events by city:", error);
    res.status(500).json({
      message: "Error fetching events by city",
      error: error.message,
    });
  }
};
