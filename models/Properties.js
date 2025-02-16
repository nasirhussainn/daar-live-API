const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Property schema
const PropertySchema = new Schema({
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Assuming there's a User model

    title: { type: String, required: true },
    description: { type: String },

    property_purpose: { type: String, enum: ['sell', 'rent'], required: true },
    property_duration: { type: String, enum: ['short_term', 'long_term'], required: true }, // Added

    property_status: { 
        type: String, 
        enum: ['pending', 'approved', 'active', 'rented', 'sold', 'disapproved'], 
        default: 'pending' 
    }, 

    charge_per: { type: String }, 
    
    property_type: { type: Schema.Types.ObjectId, ref: 'PropertyType', required: true },
    property_subtype: { type: Schema.Types.ObjectId, ref: 'PropertySubtype', required: true },

    // Location fields
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },

    location: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    media: { type: Schema.Types.ObjectId, ref: 'Media', required: false },

    area_size: { type: String, required: true }, // Changed from String to Number
    price: { type: String, required: true },

    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },

    amenities: [{ type: Schema.Types.ObjectId, ref: 'Amenities' }], // List of amenities

    security_deposit: { type: String, required: true }, // Changed to match request field name

    is_available: { type: Boolean, default: true },
    is_feature: { type: Boolean, default: false }, // Fixed naming consistency

    allow_booking: { type: Boolean, default: true },

    no_of_days: { type: Number, required: true }, // Changed to `required: true`
    payment_date: { type: String, required: false },

    transaction_price: { type: String, required: true }, // Added missing field

    created_by: { type: String, enum: ['admin', 'realtor'], required: true }, // Track who created it

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Create Property model
const Property = mongoose.model('Property', PropertySchema);
module.exports = Property;
