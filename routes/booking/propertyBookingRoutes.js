const express = require("express");
const router = express.Router();
const bookingController = require("../../controller/booking/propertyBookingController");

// Book a property
router.post("/book", bookingController.bookProperty);
router.put("/confirm-booking", bookingController.confirmBooking);

router.get("/all-booking", bookingController.getAllBookings);
router.get("/bookingId/:booking_id", bookingController.getBookingById);
router.get("/bookingPropertyViaStatus/:property_id", bookingController.getBookingsByPropertyId)
router.get("/bookingPropertyDetail/:property_id", bookingController.getBookedPropertyDetails)
// Cancel a booking
router.put("/cancel/:booking_id", bookingController.cancelBooking);

module.exports = router;
