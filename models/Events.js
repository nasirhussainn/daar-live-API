const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Import the Location model for referencing
const Location = require('./Location');

// Define the Event schema
const EventSchema = new Schema({
    host_id: { type: Schema.Types.ObjectId, required: false, ref: 'User' }, // Assuming there's a User model
    title: { type: String, required: true },
    description: { type: String },
    event_type: { type: String, required: true },
    event_subtype: { type: String },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    status: { type: String, enum: ['pending', 'approved', 'declined', 'completed'], default: 'pending' },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Create Event model
const Event = mongoose.model('Event', EventSchema);
module.exports = Event;
