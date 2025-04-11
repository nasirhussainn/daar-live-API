const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    review_for: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'review_for_type', 
    },
    review_for_type: {
      type: String,
      required: true,
      enum: ['User', 'Event', 'Property'],
    },
    review_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    review_description: {
      type: Map,
      of: String,
      required: true,
    },    
    review_rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5, 
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

const Review = mongoose.model('Review', ReviewSchema);
module.exports = Review;
