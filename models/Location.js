const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    nearbyLocations: [{ type: String }], // e.g., ["Mall", "Hospital", "Metro Station"]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", LocationSchema);
