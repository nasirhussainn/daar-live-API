const mongoose = require("mongoose");

const PropertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    propertyPurpose: { type: String, enum: ["sale", "rent"], required: true },
    propertyStatus: { type: String, enum: ["available", "sold", "rented"], required: true },
    propertyDuration: { type: String, required: true }, // e.g., "Monthly", "Yearly"
    chargePer: { type: String, enum: ["day", "week", "month", "year"], required: true },
    propertyType: { type: String, required: true }, // e.g., "Apartment", "Villa"
    propertySubType: { type: String },
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    areaSize: { type: Number, required: true },
    price: { type: Number, required: true },
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    amenities: [{ type: String }], // e.g., ["Swimming Pool", "Gym"]
    description: { type: String },
    securityDeposit: { type: Number },
    isAvailable: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    realtorId: { type: mongoose.Schema.Types.ObjectId, ref: "Realtor", required: true },
    images: [{ type: String }], // Store image URLs instead of XFile
    video: { type: String }, // Store video URL
    noOfDays: { type: Number },
    paymentDate: { type: Date },
    isFeature: { type: Boolean, default: false },
    allowBooking: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Property", PropertySchema);
