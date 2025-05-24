const mongoose = require("mongoose");

const AmenitySchema = new mongoose.Schema(
  {
    name: {
      type: Map,
      of: String,
      required: true,
      unique: true,
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Amenities", AmenitySchema);
