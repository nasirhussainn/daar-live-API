const express = require("express");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../../config/jwt"); // JWT helper function
const User = require("../../models/User"); // User model

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // Validate request
    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Email, password, and role are required." });
    }

    // Find the user by email and role
    const user = await User.findOne({ email, role });

    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found with this role." });
    }

    // Check if the user's email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        message:
          "Email not verified. Please verify your email before logging in.",
      });
    }

    // If the user is a realtor, check if the phone number is verified
    if (role === "realtor" && !user.phone_verified) {
      return res.status(403).json({
        message:
          "Phone number not verified. Please verify your phone number before logging in.",
      });
    }

    if (role === "realtor" && user.account_status !== "active") {
      if (user.account_status === "pending") {
        return res.status(403).json({
          message:
            "Account is pending. Please wait for approval before logging in.",
        });
      } else if (user.account_status === "approved") {
        return res.status(403).json({
          message:
            "Account is approved but not active. Please check your email for activation link.",
        });
      }
    }

    // Check if the password matches
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid password." });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set login token and expiry (e.g., token expires in 7 days)
    const expiryTime = new Date();
    expiryTime.setDate(expiryTime.getDate() + 7); // Token valid for 7 days

    user.login_token = token;
    user.login_token_expiry = expiryTime;

    await user.save(); // Save token and expiry in the database

    // Send response with token and user details
    return res.status(200).json({
      message: "Login successful.",
      token: token,
      user: {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.post("/firebase-login", async (req, res) => {
  role = "buyer";
  const { idToken } = req.body;

  // Check if the required fields are provided for buyer or realtor
  if (!idToken || !role) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email } = decodedToken;

    // Ensure role is buyer or realtor
    if (role !== "buyer") {
      return res.status(400).json({
        message: "Continue with Google/Apple is only available for buyers.",
      });
    }

    // Check if user already exists with the same email and role
    let existingUser = await User.findOne({ email, role });
    if (!existingUser.email_verified) {
      return res.status(400).json({ message: "Email not verified." });
    }
    if (existingUser && existingUser.account_type === "google") {
      const token = generateToken(existingUser);
      const expiryTime = new Date();
      expiryTime.setDate(expiryTime.getDate() + 7);
      existingUser.login_token = token;
      existingUser.login_token_expiry = expiryTime;
      await existingUser.save();

      return res.status(200).json({
        message: "Login successful.",
        token: token,
        user: {
          email: existingUser.email,
          full_name: existingUser.full_name,
          role: existingUser.role,
          account_type: existingUser.account_type,
        },
      });
    } else if (existingUser && existingUser.account_type !== "google") {
      if (existingUser.account_type === "manual") {
        return res.status(400).json({
          message:
            "User already exist. Please use the existing account to login",
        });
      } else {
        return res.status(400).json({
          message:
            "User already exist with Apple account. Please use the existing account to login",
        });
      }
    } else {
      // For buyer, just saving basic user info
      const newUser = new User({
        full_name: name,
        email,
        role,
        account_type: "google",
        profile_picture: imageUrl,
        phone_number: null,
        email_verified: true, // Firebase automatically verifies email
        phone_verified: false, // This would be handled via Twilio
      });

      // Save the buyer data
      await newUser.save();

      // Send response with user details
      return res.status(201).json({
        message: "User registered successfully",
        user: {
          full_name: newUser.full_name,
          email: newUser.email,
          phone_number: newUser.phone_number,
          role: newUser.role,
          account_type: newUser.account_type,
          profile_picture: newUser.profile_picture,
          email_verified: newUser.email_verified,
          phone_verified: newUser.phone_verified,
        },
      });
    }
  } catch (error) {
    console.error("Firebase Signup Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

module.exports = router;
