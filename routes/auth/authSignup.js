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
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require("../../config/firebaseServiceAccount.json")),
  });
}

// Manual Signup with Profile Picture Upload
router.post("/signup", upload.single("profilePicture"), async (req, res) => {
  try {
    const { 
      full_name, 
      email, 
      password, 
      role, 
      business_name, 
      customer_id, 
      phone_number,
      subscription // Accept subscription from request body
    } = req.body;

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

    // If the user is a realtor, create a corresponding Realtor document with subscription data
    if (role === "realtor") {
      if (!subscription || !subscription.subscription_id || !subscription.plan_name || !subscription.start_date || !subscription.end_date || !subscription.status) {
        return res.status(400).json({ message: "Complete subscription details are required for realtors." });
      }

      const realtorData = {
        user_id: newUser._id,
        business_name,
        customer_id,
        subscription: {
          subscription_id: subscription.subscription_id,
          plan_name: subscription.plan_name,
          start_date: new Date(subscription.start_date),
          end_date: new Date(subscription.end_date),
          status: subscription.status,
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


router.post("/firebase-signup", async (req, res) => {
  role = 'buyer';
  const { idToken } = req.body;

  // Check if the required fields are provided for buyer or realtor
  if (!idToken || !role ) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // Ensure role is buyer or realtor
    if (role !== "buyer" ) {
      return res.status(400).json({ message: "Continue with Google/Apple is only available for buyers." });
    }

    // Check if user already exists with the same email and role
    let existingUser = await User.findOne({ email, role });
    if (existingUser) {
      return res.status(400).json({ message: `${role} with this email already exists, please login instead.` });
    }

    // Upload profile picture to Cloudinary if provided
    let imageUrl = null;
    if (picture || req.file) {
      imageUrl = picture || await uploadToCloudinary(req.file.buffer);
    }

    // For buyer, just saving basic user info
    const newUser = new User({
      full_name: name,
      email,
      role,
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
        profile_picture: newUser.profile_picture,
        email_verified: newUser.email_verified,
        phone_verified: newUser.phone_verified, 
      },
    });
  } catch (error) {
    console.error("Firebase Signup Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

module.exports = router;
