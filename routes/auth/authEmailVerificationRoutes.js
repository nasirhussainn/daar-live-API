const express = require("express");
const { verifyEmail } = require("../../controller/auth/authEmailVerificationController"); // Import controller
const router = express.Router();

// Route for email verification
router.get("/verify-email/:token", verifyEmail);

module.exports = router;
