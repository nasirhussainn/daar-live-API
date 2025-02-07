const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs"); 
const User = require("../../models/User"); // Import the User model
const { sendPasswordResetEmail } = require("../../config/mailer"); // Import the sendVerificationEmail function
require("dotenv").config();

// Forgot Password API
router.post("/forgot-password", async (req, res) => {
  const { email, role } = req.body;  // Accept role in the request

  try {
    // Find user by email and role
    const user = await User.findOne({ email, role });

    if (!user) {
      return res.status(400).json({ message: "No user found with this email and role combination." });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 120000; // Token valid for 1 hour

    // Update user with reset token and expiry
    user.password_reset_token = resetToken;
    user.password_reset_token_expiry = resetTokenExpiry;
    await user.save();

    // Send password reset email
    const resetLink = `${process.env.BASE_URL}/auth/reset-password/${resetToken}`;
    // const mailContent = `<p>Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a>`;

    // Customize the email content depending on the user role
    if (user.role === 'realtor') {
      await sendPasswordResetEmail(email, resetLink);
    } else {
      await sendPasswordResetEmail(email, resetLink);
    }

    return res.status(200).json({ message: "Password reset link sent to your email." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
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
      const resetLink = `${process.env.BASE_URL}/auth/reset-password/${newResetToken}`;
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