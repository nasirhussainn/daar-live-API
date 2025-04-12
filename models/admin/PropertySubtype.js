const mongoose = require("mongoose");

const PropertySubtypeSchema = new mongoose.Schema({
    name: {
      type: Map,
      of: String,
      required: true,
      trim: true
    },
    property_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyType",
      required: true
    },
    property_for: {
      type: String,
      enum: ["rent", "sell"],
      required: true
    },
    property_duration: {
      type: String,
      enum: ["short_term", "long_term"],
      required: function () {
        return this.property_for === "rent";
      }
    },
    is_active: {
      type: Boolean,
      default: true, // By default, subtypes are also active
    }
}, { timestamps: true });

module.exports = mongoose.model("PropertySubtype", PropertySubtypeSchema);
