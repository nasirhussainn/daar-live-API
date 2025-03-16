const express = require("express");
const router = express.Router();
const otpController = require("../../controller/auth/authPhoneVerificationController");

router.post("/send-otp", otpController.sendOTP);
router.post("/resend-otp", otpController.resendOTP);
router.post("/verify-otp", otpController.verifyOTP);

module.exports = router;
