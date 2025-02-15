const mongoose = require("mongoose");

const PropertySubtypeSchema = new mongoose.Schema({
    name: {
      type: String,
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
      type: String, // Only required if "rent" is selected
      enum: ["short_term", "long_term"],
      required: function () {
        return this.property_for === "rent";
      }
    }
  }, { timestamps: true });
  
  module.exports = mongoose.model("PropertySubtype", PropertySubtypeSchema);
  