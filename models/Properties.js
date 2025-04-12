const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const FeaturedEntity = require("./FeaturedEntity");

// Define the Property schema
const PropertySchema = new Schema({
  owner_id: {
    type: Schema.Types.ObjectId,
    refPath: "created_by", // Dynamically references 'User' or 'Admin'
    required: true,
  },

  created_by: { 
    type: String, 
    enum: ["User", "Admin"], // Must match the actual model names
    required: true, 
  },

  title: {
    type: Map,
    of: String,
    required: true,
  },
  description:  {
    type: Map,
    of: String,
    required: true,
  },

  property_purpose: { type: String, enum: ["sell", "rent"], required: true },
  property_duration: { type: String },

  property_status: {
    type: String,
    enum: ["pending", "approved", "active", "rented", "sold", "disapproved"],
    default: "pending",
  },

  charge_per: { type: String },

  property_type: { type: Schema.Types.ObjectId, ref: "PropertyType", required: true },
  property_subtype: { type: Schema.Types.ObjectId, ref: "PropertySubtype", required: true },

  // Location fields
  country:  {
    type: Map,
    of: String,
  },
  state:  {
    type: Map,
    of: String,
  },
  city:  {
    type: Map,
    of: String,
  },

  location: { type: Schema.Types.ObjectId, ref: "Location" },
  media: { type: Schema.Types.ObjectId, ref: "Media" },
  feature_details: { type: Schema.Types.ObjectId, ref: "FeaturedEntity" },

  area_size: { type: String, required: true }, // Changed from String to Number
  price: { type: Number, required: true },

  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },

  amenities: [{ type: Schema.Types.ObjectId, ref: "Amenities" }], // List of amenities

  security_deposit: { type: String }, // Changed to match request field name

  is_available: { type: Boolean, default: true },
  is_feature: { type: Boolean, default: false },

  allow_booking: { type: Boolean, default: true },

  avg_rating: { type: Number, default: 0 },

  is_booked: { type: Boolean, default: false }, // Tracks if the property is booked
  cancelation_reason: { type: Map, of: String, default: null },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Create Property model
const Property = mongoose.model("Property", PropertySchema);
module.exports = Property;
