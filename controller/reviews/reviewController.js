const Review = require("../../models/Review"); // Import the Review model

const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const Event = require("../../models/Events");
const Property = require("../../models/Properties");
const Notification = require("../../models/Notification"); 
const { sendResponse } = require("../../services/translateHelper");

const mongoose = require("mongoose");

// Function to recalculate avg_rating for a User, Event, or Property
const recalculateAvgRating = async (
  model,
  modelId,
  session,
  review_for_type
) => {
  try {
    // Find all reviews for the given modelId
    const reviews = await Review.find({ review_for: modelId }).session(session);

    // Calculate total rating and average rating
    const totalRating = reviews.reduce(
      (acc, review) => acc + review.review_rating,
      0
    );
    const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Determine how to update the entity (Realtor needs a special case)
    if (review_for_type === "User") {
      await model.findOneAndUpdate(
        { user_id: modelId }, // Use user_id instead of _id for Realtor
        { avg_rating: avgRating },
        { session }
      );
    } else {
      await model.findByIdAndUpdate(
        modelId,
        { avg_rating: avgRating },
        { session }
      );
    }
  } catch (error) {
    console.error("Error recalculating average rating:", error);
  }
};

exports.addReview = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      review_for,
      review_for_type,
      review_by,
      review_description,
      review_rating,
    } = req.body;

    if (!["User", "Event", "Property"].includes(review_for_type)) {
      return res.status(400).json({ message: "Invalid review type" });
    }

    let existingReview = await Review.findOne({
      review_for,
      review_for_type,
      review_by,
    }).session(session);

    let target;
    let model;
    let recipientUserId; // User to notify

    if (review_for_type === "User") {
      target = await Realtor.findOne({ user_id: review_for }).session(session);
      if (!target)
        return res.status(404).json({ message: "Realtor not found for the given User" });
      model = Realtor;
      recipientUserId = target.user_id; // Notify the realtor
    } else if (review_for_type === "Event") {
      target = await Event.findById(review_for).session(session);
      if (!target) return res.status(404).json({ message: "Event not found" });
      model = Event;
      recipientUserId = target.organizer; // Notify the event organizer
    } else if (review_for_type === "Property") {
      target = await Property.findById(review_for).session(session);
      if (!target) return res.status(404).json({ message: "Property not found" });
      model = Property;
      recipientUserId = target.owner; // Notify the property owner
    }

    let review;
    let isNewReview = false; // Track if it's a new review

    if (existingReview) {
      existingReview.review_description = review_description;
      existingReview.review_rating = review_rating;
      existingReview.updated_at = new Date();
      await existingReview.save({ session });
      review = existingReview;
    } else {
      review = new Review({
        review_for,
        review_for_type,
        review_by,
        review_description,
        review_rating,
      });
      await review.save({ session });
      isNewReview = true;
    }

    await recalculateAvgRating(model, review_for, session, review_for_type);

    // Create notification for the recipient
    if (recipientUserId) {
      const notification = new Notification({
        user: recipientUserId,
        notification_type: "Review",
        reference_id: review._id,
        title: isNewReview ? "New Review Received" : "Review Updated",
        message: isNewReview
          ? `You have received a new review with a rating of ${review_rating}.`
          : `Your review has been updated with a new rating of ${review_rating}.`,
        is_read: false,
      });

      await notification.save({ session }); // Save notification within transaction
    }

    await session.commitTransaction();
    res.status(200).json({ message: "Review added successfully!", review });

  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({ message: "Error adding review", error: error.message });
  } finally {
    session.endSession();
  }
};



exports.updateReview = async (req, res) => {
    const session = await mongoose.startSession(); // Start session
    session.startTransaction(); // Begin transaction
  
    try {
      const { id } = req.params; // Get review ID from URL params
      const { review_description, review_rating } = req.body;
  
      // Validate inputs
      if (!review_description && review_rating === undefined) {
        return res.status(400).json({ message: "No valid fields provided for update" });
      }
  
      // Find the existing review
      const review = await Review.findById(id).session(session);
      if (!review) return res.status(404).json({ message: "Review not found" });
  
      // Update only the allowed fields
      if (review_description) review.review_description = review_description;
      if (review_rating !== undefined) review.review_rating = review_rating;
  
      await review.save({ session }); // Save changes within transaction
  
      // Recalculate avg_rating for the entity (User, Event, or Property)
      let model;
      if (review.review_for_type === "User") {
        model = Realtor;
      } else if (review.review_for_type === "Event") {
        model = Event;
      } else if (review.review_for_type === "Property") {
        model = Property;
      }
  
      await recalculateAvgRating(model, review.review_for, session, review.review_for_type);
  
      await session.commitTransaction(); // Commit transaction
  
      res.status(200).json({ message: "Review updated successfully!", review });
    } catch (error) {
      await session.abortTransaction(); // Abort transaction on error
      console.error(error);
      res.status(500).json({ message: "Error updating review", error: error.message });
    } finally {
      session.endSession(); // End the session
    }
  };
  

exports.getAllReviews = async (req, res) => {
  try {
   const reviews = await Review.find()
  .populate("review_for") // Populate the reference to the review_for entity
  .populate({
    path: 'review_by',
    select: 'full_name email profile_picture'
  }); // Populate the reference to the review_by entity with specific fields

    
    res.status(200).json({ reviews });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching reviews", error: error.message });
  }
};

exports.getReviewsByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    // Validate review type
    if (!["User", "Event", "Property"].includes(entityType)) {
      return res.status(400).json({ message: "Invalid entity type" });
    }

    const reviews = await Review.find({
      review_for: entityId,
      review_for_type: entityType,
    }).populate({
      path: 'review_by',
      select: 'full_name email profile_picture'
    });

    if (reviews.length === 0) {
      return res.status(404).json({ message: "No reviews found" });
    }

    res.status(200).json({ reviews });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching reviews", error: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the review by ID
    const deletedReview = await Review.findByIdAndDelete(id);

    if (!deletedReview) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error deleting review", error: error.message });
  }
};

exports.getReviewById = async (req, res) => {
  try {
    const { id } = req.params; // The review ID

    // Find the review by ID and populate the reviewer details
    const review = await Review.findById(id).populate({
      path: 'review_by',
      select: 'full_name email profile_picture'
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // return sendResponse(res, 201, review);
    res.status(200).json({ review });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching review", error: error.message });
  }
};
