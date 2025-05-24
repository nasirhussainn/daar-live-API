const express = require("express");
const router = express.Router();
const checkInOutController = require("../../controller/booking/checkInOut/checkInOutController");

// Route for handling check-in and check-out
router.post("/:id/check", checkInOutController.checkInOut);
// router.get('/:booking_type?', checkInOutController.getAllCheckInOutLogsWithDetails);
router.get("/", checkInOutController.getAllCheckLogs);

module.exports = router;
