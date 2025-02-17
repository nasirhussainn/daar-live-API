const mongoose = require('mongoose');
const { Schema } = mongoose;

const realtorSchema = new Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  business_name: { type: String , required: true },
  avg_rating: { type: Number, default: 0 },
  customer_id: { type: String },
  subscription: { // Embedded subscription details
    subscription_id: { type: String },
    plan_name: { type: String },
    start_date: { type: Date },
    end_date: { type: Date },
    status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'pending' }
  }
});

const Realtor = mongoose.model('Realtor', realtorSchema);
module.exports = Realtor;
