const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../../config/jwt'); // JWT helper function
const User = require('../../models/User'); // User model

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // Validate request
    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required." });
    }

    // Find the user by email and role
    const user = await User.findOne({ email, role });

    if (!user) {
      return res.status(400).json({ message: "User not found with this role." });
    }

    // Check if the user's email is verified
    if (!user.email_verified) {
      return res.status(403).json({ message: "Email not verified. Please verify your email before logging in." });
    }

    // If the user is a realtor, check if the phone number is verified
    if (role === "realtor" && !user.phone_verified) {
      return res.status(403).json({ message: "Phone number not verified. Please verify your phone number before logging in." });
    }

    // Check if the password matches
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid password." });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Send response with token and user role
    return res.status(200).json({
      message: "Login successful.",
      token: token,
      user: {
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});


module.exports = router;
