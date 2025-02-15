const mongoose = require("mongoose");

const PropertyTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    property_for: {
      type: [String],
      enum: ["rent", "sell"],
      required: true,
    },
    allowed_durations: {
      type: [String],
      enum: ["short_term", "long_term"],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true // Default active, admin can deactivate
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PropertyType", PropertyTypeSchema);
