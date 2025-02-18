const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeaturedEntitySchema = new Schema({
  transaction_id: { type: String, unique: true},
  transaction_price: { type: String },
  payment_date: { type: String },
  no_of_days: { type: Number }, 
  expiration_date: { type: Date }, 
  is_active: { type: Boolean, default: true },
  
  // Entity type to differentiate between Property or Event
  entity_type: { 
    type: String, 
    enum: ['property', 'event'],  // You can limit to 'property' or 'event'
    required: true 
  },
  
  // Optional references to Property or Event, if you need it
  property_id: { type: Schema.Types.ObjectId, ref: 'Property' },
  event_id: { type: Schema.Types.ObjectId, ref: 'Event' },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

FeaturedEntitySchema.methods.calculateExpirationDate = function () {
  const expirationDate = new Date(this.created_at);
  expirationDate.setDate(expirationDate.getDate() + this.no_of_days);
  this.expiration_date = expirationDate;
};

FeaturedEntitySchema.pre('save', function (next) {
  this.calculateExpirationDate();
  next();
});

const FeaturedEntity = mongoose.model('FeaturedEntity', FeaturedEntitySchema);
module.exports = FeaturedEntity;
