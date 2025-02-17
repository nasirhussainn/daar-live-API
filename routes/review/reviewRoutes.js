const express = require('express');
const router = express.Router();

const {
  addReview,
  getAllReviews,
  getReviewsByEntity,
  updateReview,
  deleteReview,
  getReviewById
} = require("../../controller/reviews/reviewController");

// CRUD Routes
router.post('/', addReview); // Add a review
router.get('/', getAllReviews); // Get all reviews
router.get('/:entityType/:entityId', getReviewsByEntity); // Get reviews by entity
router.get('/:id', getReviewById); // Get reviews by entity
router.put('/:id', updateReview); // Update a review
router.delete('/:id', deleteReview); // Delete a review

module.exports = router;
