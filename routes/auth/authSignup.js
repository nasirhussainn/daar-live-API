const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const admin = require("../../config/firebase"); 
const upload = require("../../middlewares/multerConfig"); 
const uploadToCloudinary  = require("../../config/cloudinary");
const { sendVerificationEmail } = require("../../config/mailer");
const crypto = require("crypto");

// Manual Signup with Profile Picture Upload
router.post("/signup", upload.single("profilePicture"), async (req, res) => {
  try {
    const { full_name, email, password, role, business_name, customer_id } = req.body;

    // Check if a user already exists with the same email and same role
    let existingUser = await User.findOne({ email, role });
    if (existingUser) {
      return res.status(400).json({ message: `${role} with this email already exists` });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upload profile picture to Cloudinary if provided
    let imageUrl = null;
    if (req.file) { // ✅ Ensure file exists
      imageUrl = await uploadToCloudinary(req.file.buffer);
    }

    // Generate email verification token (valid for 1 hour)
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationTokenExpiry = Date.now() + 120000; // 2 minutes from now


    // Create new user
    const newUser = new User({
      full_name,
      email,
      password: hashedPassword,
      role,
      profile_picture: imageUrl,
      email_verified: false,
      email_verification_token: emailVerificationToken,
      email_verification_token_expiry: emailVerificationTokenExpiry,
    });

    await newUser.save();

    // If the user is a realtor, create a corresponding Realtor document
    if (role === "realtor") {
      const realtorData = {
        user_id: newUser._id,
        business_name: business_name,
        customer_id: customer_id,
        subscription: {
          subscription_id: crypto.randomBytes(16).toString("hex"), // Random subscription ID for demo
          plan_name: "basic", // Default subscription plan
          start_date: Date.now(),
          end_date: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year subscription
          status: "active",
        },
      };

      const newRealtor = new Realtor(realtorData);
      await newRealtor.save();
    }

    // Send email verification link
    const verificationLink = `http://localhost:5000/auth/verify-email/${emailVerificationToken}`;
    await sendVerificationEmail(email, verificationLink);

    return res.status(201).json({
      message: "User registered successfully. Please verify your email.",
      user: {
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        profile_picture: newUser.profile_picture,
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
