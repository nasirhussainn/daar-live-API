const Property = require("../../models/Properties");
const Event = require("../../models/Events");
const Location = require("../../models/Location");

exports.findNearbyProperties = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const maxDistance = 50000; // Default to 5km

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    // First, find nearby locations
    const nearbyLocations = await Location.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] }, // MongoDB requires [lng, lat]
          distanceField: "distance",
          maxDistance: maxDistance, // Distance in meters
          spherical: true,
        },
      },
      { $project: { _id: 1 } }, // Only return location IDs
    ]);

    // Extract location IDs
    const locationIds = nearbyLocations.map((loc) => loc._id);

    // Find properties linked to those locations
    const nearbyProperties = await Property.find({ location: { $in: locationIds } }).populate("location");

    return res.status(200).json({ success: true, properties: nearbyProperties });
  } catch (error) {
    console.error("Error finding nearby properties:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.findNearbyEvents = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const maxDistance = 50000; // Default to 5km

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    // First, find nearby locations
    const nearbyLocations = await Location.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] }, // MongoDB requires [lng, lat]
          distanceField: "distance",
          maxDistance: maxDistance, // Distance in meters
          spherical: true,
        },
      },
      { $project: { _id: 1 } }, // Only return location IDs
    ]);

    // Extract location IDs
    const locationIds = nearbyLocations.map((loc) => loc._id);

    // Find properties linked to those locations
    const nearbyEvents = await Event.find({ location: { $in: locationIds } }).populate("location");

    return res.status(200).json({ success: true, events: nearbyEvents });
  } catch (error) {
    console.error("Error finding nearby events:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

