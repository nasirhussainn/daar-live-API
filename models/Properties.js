const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Import related models
const Location = require('./Location.js');
const PropertyType = require('./admin/PropertyType.js');
const PropertySubtype = require('./admin/PropertySubtype.js');
const Media = require('./Media.js');
const Amenities = require('./admin/Amenities.js');

// Define the Property schema
const PropertySchema = new Schema({
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Assuming there's a User model
    title: { type: String, required: true },
    description: { type: String },
    
    property_for: { type: String, enum: ['sell', 'rent'], required: true },

    property_status: { 
        type: String, 
        enum: ['pending', 'approved', 'declined', 'rented', 'sold out'], 
        default: 'pending' 
    }, // Approval status

    charge_per: { type: String }, // Charge per time unit (e.g., per month)
    property_type: { type: Schema.Types.ObjectId, ref: 'PropertyType', required: true }, // Reference PropertyType
    property_subtype: { type: Schema.Types.ObjectId, ref: 'PropertySubtype', required: true }, // Reference PropertySubtype

    // Location reference
    location: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    media: [{ type: Schema.Types.ObjectId, ref: 'Media' }],

    area_size: { type: String, required: true }, // Area size of the property
    price: { type: Number, required: true }, // Price of the property
    bedrooms: { type: Number, required: true }, // Number of bedrooms
    bathrooms: { type: Number, required: true }, // Number of bathrooms

    amenities: [{ type: Schema.Types.ObjectId, ref: 'Amenities' }],

    security_deposit: { type: Number }, // Security deposit amount
    is_available: { type: Boolean, default: true }, // Availability status

    // Media reference (images & videos stored in Media model)
    media: { type: Schema.Types.ObjectId, ref: 'Media', required: false },

    no_of_days: { type: Number, required: false }, // Number of days applicable for rent
    payment_date: { type: Date, required: false }, // Payment date

    is_feature: { type: Boolean, default: false }, // Whether the property is featured
    allow_booking: { type: Boolean, default: true }, // Whether booking is allowed

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Create Property model
const Property = mongoose.model('Property', PropertySchema);
module.exports = Property;
