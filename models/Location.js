const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Location schema
const LocationSchema = new Schema({
    address: { type: String, required: true },
    postal_code: { type: String },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    location_address: {type: String},
    nearbyLocations: [{ type: String }], 
    created_at: { type: Date, default: Date.now }
});

// Create Location model
module.exports = mongoose.model('Location', LocationSchema);
