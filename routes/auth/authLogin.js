const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../../config/jwt'); // JWT helper function
const User = require('../../models/User'); // User model

const router = express.Router();

// Login API with role handling (Realtor or Buyer)
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;  // Role can also be sent to clarify the login type

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    // Check if the role matches, if provided
    if (role && user.role !== role) {
      return res.status(400).json({ message: `You are not a ${role}. Please check your role.` });
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
