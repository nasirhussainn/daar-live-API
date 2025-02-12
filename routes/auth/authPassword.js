const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs"); 
const User = require("../../models/User"); // Import the User model
const { sendPasswordResetEmail } = require("../../config/mailer"); // Import the sendVerificationEmail function
require("dotenv").config();
const path = require("path");

const BASE_URL = process.env.BASE_URL;

// Forgot Password API
router.post("/forgot-password/", async (req, res) => {
  const { email, role } = req.body;  // Accept role in the request

  try {
    // Validate input
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required." });
    }

    // Find user by email and role
    const user = await User.findOne({ email, role });

    if (!user || user.account_type!=="manual") {
      return res.status(400).json({ message: "No user found with this email role & account type combination." });
    }

    // Check if the user's email is verified
    if (!user.email_verified) {
      return res.status(403).json({ message: "Email not verified. Please verify your email before requesting a password reset." });
    }

    // If the user is a realtor, check if the phone number is verified
    if (role === "realtor" && !user.phone_verified) {
      return res.status(403).json({ message: "Phone number not verified. Please verify your phone number before requesting a password reset." });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // Token valid for 1 hour

    // Update user with reset token and expiry
    user.password_reset_token = resetToken;
    user.password_reset_token_expiry = resetTokenExpiry;
    await user.save();

    // Generate password reset link
    const resetLink = `https://daar-live-api.vercel.app/auth/reset-password-page/${resetToken}`;

    // Send password reset email
    await sendPasswordResetEmail(email, resetLink);

    return res.status(200).json({ message: "Password reset link sent to your email." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.get("/reset-password-page/:token", (req, res) => {
  const filePath = path.join(__dirname, '../../views', 'reset-password.html');
  res.sendFile(filePath);
});

// Reset Password API
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;  // Accept role in the request

  try {
    // Find user by reset token
    const user = await User.findOne({ password_reset_token: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid password reset token." });
    }

    // Check if the token has expired
    if (user.password_reset_token_expiry < Date.now()) {
      // If the token has expired, generate a new reset token and send email again
      const newResetToken = crypto.randomBytes(32).toString("hex");
      const newResetTokenExpiry = Date.now() + 3600000; // New token valid for 1 hour

      // Update the user's reset token and expiry
      user.password_reset_token = newResetToken;
      user.password_reset_token_expiry = newResetTokenExpiry;
      await user.save();

      // Send the new password reset email
      const resetLink = `https://daar-live-api.vercel.app/auth/reset-password-page/${newResetToken}`;
      // const mailContent = `<p>Your previous password reset token expired. Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a>`;

      // Customize the email content depending on the user role
      await sendPasswordResetEmail(user.email, resetLink);
     
      return res.status(400).json({ message: "Your password reset token expired. A new link has been sent to your email." });
    }


    // If the role matches, hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and clear the reset token
    user.password = hashedPassword;
    user.password_reset_token = undefined;
    user.password_reset_token_expiry = undefined;
    await user.save();

    return res.status(200).json({ message: "Password has been successfully reset." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

module.exports = router;