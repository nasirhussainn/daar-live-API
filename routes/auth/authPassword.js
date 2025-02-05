const express = require("express");
const router = express.Router();
const crypto = require("crypto");
// const sendEmail = require("../../mailer"); // Import the sendEmail function

// Temporary in-memory OTP storage (Use a database in production)
let otpStore = {};

// Request OTP API
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Generate OTP (6-digit)
  const otp = crypto.randomInt(100000, 999999).toString();

  // Store OTP with expiry time (5 minutes)
  otpStore[email] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // OTP expires in 5 minutes
  };

  // Send OTP to user's email
  // sendEmail(email, "Password Reset OTP", `Your OTP for password reset is: ${otp}`)
  //   .then(() => {
  //     res.status(200).json({
  //       message: "OTP sent to email successfully. It will expire in 5 minutes.",
  //     });
  //   })
  //   .catch((error) => {
  //     res.status(500).json({ message: error.message });
  //   });
});

// Reset Password API
router.post("/reset-password", (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "Email, OTP, and new password are required" });
  }

  // Check if OTP exists and is valid
  const storedOtp = otpStore[email];

  if (!storedOtp) {
    return res.status(400).json({ message: "OTP not found for this email" });
  }

  // Check if OTP is expired
  if (Date.now() > storedOtp.expiresAt) {
    return res.status(400).json({ message: "OTP has expired" });
  }

  // Validate OTP
  if (storedOtp.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // Simulate password reset (Replace with database logic)
  const user = {
    email,
    newPassword, // In a real app, hash the password before saving it
  };

  // Reset the OTP after successful password reset
  delete otpStore[email];

  // Send confirmation of password reset
  res.status(200).json({
    message: "Password has been reset successfully",
    user,
  });
});

module.exports = router;
