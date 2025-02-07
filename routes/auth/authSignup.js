const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
// const admin = require("../../config/firebase"); 
const upload = require("../../middlewares/multerConfig"); 
const uploadToCloudinary  = require("../../config/cloudinary");
const { sendVerificationEmail } = require("../../config/mailer");
const crypto = require("crypto");
require("dotenv").config();

// Manual Signup with Profile Picture Upload
router.post("/signup", upload.single("profilePicture"), async (req, res) => {
  try {
    const { full_name, email, password, role, business_name, customer_id, phone_number } = req.body;

    // Validate required fields
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Ensure phone number is provided for realtors
    if (role === "realtor" && !phone_number) {
      return res.status(400).json({ message: "Phone number is required for realtors." });
    }

    // Ensure business details for realtors
    if (role === "realtor" && (!business_name || !customer_id)) {
      return res.status(400).json({ message: "Business name and customer ID are required for realtors." });
    }

    // Check if a user already exists with the same email and role
    let existingUser = await User.findOne({ email, role });
    if (existingUser) {
      return res.status(400).json({ message: `${role} with this email already exists` });
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

    // Create new user
    const newUser = new User({
      full_name,
      email,
      password: hashedPassword,
      phone_number,
      role,
      profile_picture: imageUrl,
      email_verified: false,
      email_verification_token: emailVerificationToken,
      email_verification_token_expiry: emailVerificationTokenExpiry,
      phone_verified: false, // Will be verified separately via Twilio
    });

    await newUser.save();

    // If the user is a realtor, create a corresponding Realtor document
    if (role === "realtor") {
      const realtorData = {
        user_id: newUser._id,
        business_name: business_name,
        customer_id: customer_id,
        subscription: {
          subscription_id: crypto.randomBytes(16).toString("hex"),
          plan_name: "basic",
          start_date: Date.now(),
          end_date: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1-year subscription
          status: "active",
        },
      };

      const newRealtor = new Realtor(realtorData);
      await newRealtor.save();
    }

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
        profile_picture: newUser.profile_picture,
        email_verified: newUser.email_verified,
        phone_verified: newUser.phone_verified, // Will be updated after Twilio verification
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});



router.post("/signup/firebase", async (req, res) => {
  const { idToken, role } = req.body;

  if (!idToken || !role) {
    return res.status(400).json({ message: "ID Token and role are required" });
  }

  try {
    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // Upload Firebase profile picture to Cloudinary
    let imageUrl = picture;
    if (picture) {
      imageUrl = await uploadToCloudinary(picture);
    }

    const user = {
      uid,
      name: name || "No Name",
      email,
      role,
      profilePicture: imageUrl,
    };

    res.status(200).json({
      message: "User authenticated successfully",
      user,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid ID Token", error: error.message });
  }
});


// Firebase Login with Google/Apple (using the ID Token)
router.post("/login/firebase", async (req, res) => {
  const { idToken } = req.body; // ID Token from frontend

  if (!idToken) {
    return res.status(400).json({ message: "ID Token is required" });
  }

  try {
    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // Simulate fetching user from DB (in reality, you'd fetch from DB)
    const user = {
      uid,
      name: name || "No Name",
      email,
      picture,
    };

    res.status(200).json({
      message: "User authenticated successfully",
      user,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid ID Token", error: error.message });
  }
});

module.exports = router;
