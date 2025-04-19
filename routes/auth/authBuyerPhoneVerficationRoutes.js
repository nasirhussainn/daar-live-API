const express = require('express');
const router = express.Router();
const authController = require('../../controller/auth/authBuyerPhoneVerficationController');

// Send OTP
router.post('/buyer-send-otp', authController.sendOTPBuyer);

// Verify OTP
router.post('/buyer-verify-otp', authController.verifyOTPBuyer);

module.exports = router;
