const express = require("express");
const router = express.Router();
const bookingController = require("../../controller/booking/eventBookingController");

// Book a property
router.post("/book", bookingController.bookEvent);
router.put("/confirm-booking", bookingController.confirmEventBooking);

router.get("/all-booking", bookingController.getAllEventBookings);
router.get("/bookingId/:booking_id", bookingController.getEventBookingById);
router.get("/bookingEventViaEntity", bookingController.getBookingsByEntitiesId);
router.get(
  "/bookingEventDetail/:event_id",
  bookingController.getBookedEventDetails,
);
// Cancel a booking
router.put("/cancel/:booking_id", bookingController.cancelEventBooking);

module.exports = router;
