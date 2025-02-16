const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Import the Location model
const Location = require('./Location');
const Media = require('./Media');
const User = require('./User');
const EventType = require('./admin/EventType');

// Define the Event schema
const EventSchema = new Schema({
    host_id: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Assuming there's a User model
    title: { type: String, required: true },
    description: { type: String, required: true },
    
    event_type: { type: Schema.Types.ObjectId, ref: 'EventType', required: true },

    status: { 
        type: String, 
        enum: ['pending', 'approved', 'declined', 'completed'], 
        default: 'pending' 
    },

    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    start_time: { type: String, required: true },  
    end_time: { type: String, required: true },  

    entry_type: { type: String },
    entry_price: { type: Number },

    location: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    media: [{ type: Schema.Types.ObjectId, ref: 'Media' }],  
    
    no_of_days: { type: Number },
    payment_date: { type: Date },

    is_feature: { type: Boolean, default: false },  // Renamed isFeature
    allow_booking: { type: Boolean, default: false },  // Renamed allowBooking

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Create Event model
const Event = mongoose.model('Event', EventSchema);
module.exports = Event;
