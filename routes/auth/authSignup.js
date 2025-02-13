const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const upload = require("../../middlewares/multerConfig");
const uploadToCloudinary = require("../../config/cloudinary");
const { sendVerificationEmail } = require("../../config/mailer");
const crypto = require("crypto");
require("dotenv").config();
const admin = require("firebase-admin");
const { generateToken } = require("../../config/jwt");

admin.initializeApp({
  credential: admin.credential.cert(
    require("../../config/firebaseServiceAccount.json")
  ),
});

// Manual Signup with Profile Picture Upload
const mongoose = require("mongoose");
const BASE_URL = process.env.BASE_URL;

router.post("/signup", upload.single("profilePicture"), async (req, res) => {
  const signup_type = "manual";
  const session = await mongoose.startSession(); // Start a session for transaction

  try {
    session.startTransaction(); // Begin transaction

    const {
      full_name,
      email,
      password,
      role,
      business_name, // Required for realtors
      phone_number, // Required for realtors
      customer_id, // Optional
      subscription, // Optional
    } = req.body;

    // Validate required fields
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Ensure business details for realtors
    if (role === "realtor" && !business_name) {
      return res.status(400).json({ message: "Business name is required for realtors." });
    }

    // Check if a user already exists with the same email
    let existingUser = await User.findOne({ email, role });
    if (existingUser) {
      return res.status(400).json({ message: `User with this email already exists` });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upload profile picture to Cloudinary if provided
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer);
    }

    // Generate email verification token (valid for 2 minutes)
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationTokenExpiry = Date.now() + 2 * 60 * 1000;

    // Create new user document
    const newUser = new User({
      full_name,
      email,
      password: hashedPassword,
      phone_number: phone_number || null,
      role,
      account_type: signup_type,
      profile_picture: imageUrl,
      email_verified: false,
      email_verification_token: emailVerificationToken,
      email_verification_token_expiry: emailVerificationTokenExpiry,
      phone_verified: false,
    });

    await newUser.save({ session }); // Save user within transaction

    // If the user is a realtor, create a corresponding Realtor document
    if (role === "realtor") {
      const newRealtor = new Realtor({
        user_id: newUser._id,
        business_name, // Required
        customer_id: customer_id || null, // Optional
        subscription: subscription
          ? {
              subscription_id: subscription.subscription_id || null,
              plan_name: subscription.plan_name || null,
              start_date: subscription.start_date ? new Date(subscription.start_date) : null,
              end_date: subscription.end_date ? new Date(subscription.end_date) : null,
              status: subscription.status || "pending",
            }
          : null, // Optional: If no subscription provided, keep it null
      });

      await newRealtor.save({ session }); // Save realtor within transaction
    }

    // Commit transaction: everything is saved successfully
    await session.commitTransaction();
    session.endSession();

    // Send email verification link
    const verificationLink = `https://daar-live-api.vercel.app/auth/verify-email/${emailVerificationToken}`;
    await sendVerificationEmail(email, verificationLink);

    return res.status(201).json({
      message: "User registered successfully. Please verify your email.",
      user: {
        full_name: newUser.full_name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        role: newUser.role,
        account_type: newUser.account_type,
        profile_picture: newUser.profile_picture,
        email_verified: newUser.email_verified,
        phone_verified: newUser.phone_verified, // Will be updated after Twilio verification
      },
    });
  } catch (error) {
    // Rollback transaction in case of any error
    await session.abortTransaction();
    session.endSession();

    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});


router.post("/firebase-signup", async (req, res) => {
  const role = "buyer"; // Define role here
  const { token: firebaseToken } = req.body; // This is the Firebase ID token sent in the request body

  // Check if the required fields are provided
  if (!firebaseToken || !role) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // Verify Firebase ID Token to get the user's details
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const { uid, email, name, picture } = decodedToken;

    // Ensure the role is 'buyer'
    if (role !== "buyer") {
      return res.status(400).json({
        message: "Continue with Google/Apple is only available for buyers.",
      });
    }

    // Check if the user already exists with the same email and role
    let existingUser = await User.findOne({ email, role });
    if (existingUser && existingUser.account_type === "google") {
      // If user exists, generate JWT token and log the user in
      const userJwt = generateToken(existingUser); // Generate JWT for session management
      const expiryTime = new Date();
      expiryTime.setDate(expiryTime.getDate() + 7);
      existingUser.login_token = userJwt;
      existingUser.login_token_expiry = expiryTime;
      await existingUser.save();

      return res.status(200).json({
        message: "User already exists, logged in successfully.",
        token: userJwt, // Send JWT token for authentication
        user: {
          full_name: existingUser.full_name,
          email: existingUser.email,
          role: existingUser.role,
          profile_picture: existingUser.profile_picture,
          email_verified: existingUser.email_verified,
          phone_verified: existingUser.phone_verified,
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
      // Upload profile picture to Cloudinary if provided
      let imageUrl = null;
      if (picture || req.file) {
        imageUrl = picture || (await uploadToCloudinary(req.file.buffer));
      }

      // For a buyer, save basic user info
      const newUser = new User({
        full_name: name || null,
        email,
        role,
        account_type: "google",
        profile_picture: imageUrl,
        phone_number: null,
        email_verified: true, // Firebase automatically verifies email
        account_status: "active",
        phone_verified: false, // This would be handled via Twilio
      });

      // Save the new user
      await newUser.save();

      // Generate JWT token after successful registration and login
      const userJwt = generateToken(newUser); // Generate JWT for session management

      // Send response with JWT token and user details
      return res.status(201).json({
        message: "User registered successfully and logged in.",
        token: userJwt, // Send JWT token for authentication
        user: {
          full_name: newUser.full_name,
          email: newUser.email,
          phone_number: newUser.phone_number,
          role: newUser.role,
          profile_picture: newUser.profile_picture,
          email_verified: newUser.email_verified,
          phone_verified: newUser.phone_verified,
        },
      });
    }
  } catch (error) {
    console.error("Firebase Signup and Login Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

module.exports = router;
