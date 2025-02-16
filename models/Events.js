const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventSchema = new Schema({
    host_id: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Assuming there's a User model
    title: { type: String, required: true },
    description: { type: String, required: true },

    event_type: [{ type: Schema.Types.ObjectId, ref: 'EventType', required: true }], // Changed to an array

    // status: { 
    //     type: String, 
    //     enum: ['pending', 'confirmed', 'canceled'], // Updated to match JSON
    //     default: 'pending' 
    // },

    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    start_time: { type: String, required: true },  
    end_time: { type: String, required: true },  

    entry_type: { type: String, required: true },
    entry_price: { type: Number },

    location: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    media: { type: Schema.Types.ObjectId, ref: 'Media', required: false },
    
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },

    no_of_days: { type: Number },
    payment_date: { type: String },
    transaction_price: { type: Number }, // Added field for transaction price when featured

    is_feature: { type: Boolean, default: false },  
    allow_booking: { type: Boolean, default: true },  

    created_by: { type: String, enum: ['realtor', 'admin'], required: true }, // Added field to track creator

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Create Event model
const Event = mongoose.model('Event', EventSchema);
module.exports = Event;
