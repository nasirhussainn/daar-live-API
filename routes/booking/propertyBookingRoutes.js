const express = require("express");
const router = express.Router();
const bookingController = require("../../controller/booking/propertyBookingController");

// Book a property
router.post("/book", bookingController.bookProperty);
router.put("/confirm-booking", bookingController.confirmPropertyBooking);

router.get("/all-booking", bookingController.getAllPropertyBookings);
router.get("/bookingId/:booking_id", bookingController.getPropertyBookingById);
router.get("/bookingPropertyViaEntity", bookingController.getBookingsByEntitiesId)
router.get("/bookingPropertyDetail/:property_id", bookingController.getBookedPropertyDetails)
// Cancel a booking
router.put("/cancel/:booking_id", bookingController.cancelPropertyBooking);

// Available slots for charge_per = hour property
router.get("/all-slots", bookingController.getSlots)

module.exports = router;
