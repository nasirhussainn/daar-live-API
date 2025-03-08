const express = require("express");
const router = express.Router();
const bookingController = require("../../controller/booking/bookingController");

// Book a property
router.post("/book", bookingController.bookProperty);

// Cancel a booking
router.put("/cancel/:booking_id", bookingController.cancelBooking);

module.exports = router;
