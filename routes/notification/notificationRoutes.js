const express = require("express");
const {
  getUserNotifications,
} = require("../../controller/notification/notificationController");

const router = express.Router();

// Fetch paginated notifications for the logged-in user
router.get("/", getUserNotifications);

module.exports = router;
