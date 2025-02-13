const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Import the Location model for referencing
const Location = require('./Location.js');

// Define the Property schema
const PropertySchema = new Schema({
    owner_id: { type: Schema.Types.ObjectId, required: false, ref: 'User' }, // Assuming there's a User model
    title: { type: String, required: true },
    description: { type: String },
    property_for: { type: String, enum: ['sell', 'rent'], required: true },
    property_type: { type: String, required: true },
    property_subtype: { type: String },
    price: { type: Number, required: true },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    status: { type: String, enum: ['pending', 'approved', 'declined', 'rented', 'sold out'], default: 'pending' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Create Property model
const Property = mongoose.model('Property', PropertySchema);
module.exports = Property
