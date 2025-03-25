const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the Location schema
const LocationSchema = new Schema(
  {
    address: { type: String, required: true },
    postal_code: { type: String },
    latitude: { type: Number, min: -90, max: 90, required: true },
    longitude: { type: Number, min: -180, max: 180, required: true },
    location_address: { type: String },
    nearbyLocations: [{ type: String }],

    // GeoJSON format for geospatial queries
    location: {
      type: { type: String, enum: ["Point"], default: "Point", required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (val) {
            return Array.isArray(val) && val.length === 2;
          },
          message: "Coordinates must be an array of [longitude, latitude]",
        },
        default: [0, 0], // Ensures no empty array
      },
    },
  },
  { timestamps: true } // ✅ Automatically adds createdAt & updatedAt
);

// ✅ Add 2dsphere index for geospatial queries
LocationSchema.index({ location: "2dsphere" });

// ✅ Middleware to auto-set `location` before saving
LocationSchema.pre("save", function (next) {
  if (
    this.isModified("latitude") ||
    this.isModified("longitude") ||
    !this.location.coordinates.length
  ) {
    if (this.latitude !== undefined && this.longitude !== undefined) {
      this.location = {
        type: "Point",
        coordinates: [this.longitude, this.latitude], // MongoDB expects [lng, lat]
      };
    }
  }
  next();
});

// Create Location model
const Location = mongoose.model("Location", LocationSchema);
module.exports = Location;
