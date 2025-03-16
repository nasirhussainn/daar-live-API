const express = require("express");
const router = express.Router();
const authController = require("../../controller/auth/authPasswordController");

// Forgot Password Route
router.post("/forgot-password", authController.forgotPassword);

// Reset Password Page Route
router.get("/reset-password-page/:token", authController.resetPasswordPage);

// Reset Password API
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;
