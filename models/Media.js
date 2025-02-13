const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Import Property and Event models for referencing
const Property = require('./Properties');
const Event = require('./Events');

// Define the Media schema
const MediaSchema = new Schema({
    entity: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'entity_type' // Dynamically refer to either Property or Event
    },
    entity_type: { 
        type: String, 
        enum: ['property', 'event'], 
        required: true 
    },
    images: { type: [String], required: false }, // Array of image URLs
    videos: { type: [String], required: false }, // Array of video URLs
    created_at: { type: Date, default: Date.now }
});

// Create Media model
const Media = mongoose.model('Media', MediaSchema);
module.exports = Media;
