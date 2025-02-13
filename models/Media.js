const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Media schema
const MediaSchema = new Schema({
    entity_id: { type: Schema.Types.ObjectId, required: true },
    entity_type: { type: String, enum: ['property', 'event'], required: true },
    images: { type: [String], required: false }, // Array of image URLs
    videos: { type: [String], required: false }, // Array of video URLs
    created_at: { type: Date, default: Date.now }
});

// Create Media model
module.exports = mongoose.model('Media', MediaSchema);
