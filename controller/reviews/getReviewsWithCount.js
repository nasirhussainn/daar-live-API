const mongoose = require("mongoose");
const Property = require("../../models/Properties");
const Event = require("../../models/Booking");
const User = require("../../models/User");
const Review = require("../../models/Review");

const getReviewsWithCount = async (reviewForId, reviewForType) => {
  try {
    const reviews = await Review.find({
      review_for: reviewForId,
      review_for_type: reviewForType,
    }).populate({
      path: "review_by",
      select: "_id email full_name profile_picture", // Select only these fields
    });

    const total_reviews = await Review.countDocuments({
      review_for: reviewForId,
      review_for_type: reviewForType,
    });

    return { total_reviews, reviews };
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return { total_reviews: 0, reviews: [] };
  }
};

const getReviewCount = async (reviewForId, reviewForType) => {
  try {
    return await Review.countDocuments({
      review_for: reviewForId,
      review_for_type: reviewForType,
    });
  } catch (error) {
    console.error("Error fetching review count:", error);
    return 0;
  }
};

module.exports = { getReviewsWithCount, getReviewCount };
