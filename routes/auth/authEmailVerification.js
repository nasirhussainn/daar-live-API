const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const User = require("../../models/User"); // Import the User model
const { sendVerificationEmail } = require("../../config/mailer"); // Import the sendVerificationEmail function
require("dotenv").config();

const BASE_URL = process.env.BASE_URL;

// Verify email API
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by the verification token
    const user = await User.findOne({ email_verification_token: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification token." });
    }

    // Check if the token has expired
    if (user.email_verification_token_expiry < Date.now()) {
      // Token expired, generate a new token and expiry
      const newEmailVerificationToken = crypto.randomBytes(32).toString("hex");
      const newEmailVerificationTokenExpiry = Date.now() + 3600000; // 1 hour from now

      // Update user with new token and expiry
      user.email_verification_token = newEmailVerificationToken;
      user.email_verification_token_expiry = newEmailVerificationTokenExpiry;

      // Save the user with updated token and expiry
      await user.save();

      // Send the new verification email
      const newVerificationLink = `https://daar-live-api.vercel.app/auth/verify-email/${newEmailVerificationToken}`;
      await sendVerificationEmail(user.email, newVerificationLink);

      return res.status(400).json({
        message: "Verification token has expired. A new verification link has been sent to your email.",
      });
    }

    // Update the user to mark email as verified
    user.email_verified = true;
    user.email_verification_token = undefined; // Remove the token after verification
    user.email_verification_token_expiry = undefined; // Clear the expiry date

    await user.save();

    return res.status(200).json({ message: "Email verified successfully!" });
  } catch (error) {
    console.error("Email Verification Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

module.exports = router;