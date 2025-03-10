const express = require("express");
const approvalController = require("../../controller/approval/approvalController");

const router = express.Router();

router.put("/sold-property/:id", approvalController.soldPropertyStatus);
router.put("/approved-property/:id", approvalController.approveProperty);
router.put("/disapproved-property/:id", approvalController.disapproveProperty);
router.put("/notAvailable-property/:id", approvalController.notAvailablePropertyStatus);
router.put("/disallowBooking-property/:id", approvalController.notForBookingProperty);

router.put("/disallowBooking-event/:id", approvalController.notForBookingEvent);

module.exports = router;
