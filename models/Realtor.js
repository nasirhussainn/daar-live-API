const mongoose = require('mongoose');
const { Schema } = mongoose;

const realtorSchema = new Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to the User model
  business_name: { type: String, required: true }, // Realtor's business name
  avg_rating: { type: Number, default: 0 }, // Average rating of the realtor
  is_subscribed: { type: Boolean, default: false }, // Subscription status (defaults to false)
  created_at: { type: Date, default: Date.now }, // Timestamp of when the realtor record was created
  updated_at: { type: Date, default: Date.now }, // Timestamp of the last update
});

const Realtor = mongoose.model('Realtor', realtorSchema);
module.exports = Realtor;
