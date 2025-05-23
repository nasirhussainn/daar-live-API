const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const { uploadToCloudinary } = require("../../config/cloudinary");
const { sendVerificationEmail } = require("../../config/mailer");
const crypto = require("crypto");
const mongoose = require("mongoose");
const admin = require("firebase-admin");
const { generateToken } = require("../../config/jwt");
const { translateText } = require("../../services/translateService");
const sendNotification = require("../notification/sendNotification");
const { getSuperAdminId } = require("../../services/getSuperAdminId");

const BASE_URL = process.env.BASE_URL;

admin.initializeApp({
  credential: admin.credential.cert(
    require("../../config/firebaseServiceAccount.json"),
  ),
});

// Manual Signup with Profile Picture Upload
exports.signup = async (req, res) => {
  const signup_type = "manual";
  let phone_issue = false;
  const session = await mongoose.startSession();

  try {
    session.startTransaction(); // Start transaction

    const { full_name, email, password, role, phone_number, business_type } =
      req.body;

    // const business_name = await translateText(req.body.business_name)

    // Validate required fields
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (role !== "buyer") {
      phone_issue = false;
    }

    // Ensure business details for realtors
    if (role === "realtor" && !business_type) {
      return res
        .status(400)
        .json({ message: "Business type is required for realtors." });
    }

    // Check if user already exists
    let existingUser = await User.findOne({ email, role });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: `User with this email already exists` });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upload profile picture to Cloudinary
    let imageUrl = null;
    if (req.files["profile_picture"]) {
      const folderName =
        role === "realtor" ? "realtors_profiles" : "buyers_profiles";
      imageUrl = await uploadToCloudinary(
        req.files["profile_picture"][0].buffer,
        folderName,
      );
    }

    // Upload Tax ID and Verification Doc (only for realtors)
    let taxIdImageUrl = null;
    let verificationDocImageUrl = null;

    if (role === "realtor") {
      if (req.files["tax_id_image"]) {
        taxIdImageUrl = await uploadToCloudinary(
          req.files["tax_id_image"][0].buffer,
          "realtors_documents",
        );
      }
      if (req.files["verification_doc_image"]) {
        verificationDocImageUrl = await uploadToCloudinary(
          req.files["verification_doc_image"][0].buffer,
          "realtors_documents",
        );
      }
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationTokenExpiry = Date.now() + 2 * 60 * 1000;

    // Create new user
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
      phone_verified: phone_issue,
    });

    await newUser.save({ session });

    // If the user is a realtor, create a corresponding Realtor document
    if (role === "realtor") {
      const newRealtor = new Realtor({
        user_id: newUser._id,
        business_name: req.body.business_name
          ? await translateText(req.body.business_name)
          : null,
        business_type, // Set as required in future steps
        tax_id_image: taxIdImageUrl,
        verification_doc_image: verificationDocImageUrl,
        avg_rating: 0,
        is_subscribed: false,
        bank_details: [], // Empty initially
        total_revenue: 0,
        available_revenue: 0,
      });

      await newRealtor.save({ session });

      // ✅ Notify admin about new Realtor signup (account approval request)
      try {
        const superAdminId = await getSuperAdminId();
        await sendNotification(
          superAdminId,
          "User",
          newUser._id,
          "New Realtor Signup",
          `${newUser.full_name} has signed up as a Realtor and is awaiting account approval.`,
        );
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    }

    await session.commitTransaction();
    session.endSession();

    // Send email verification
    const verificationLink = `https://whale-app-4nsg6.ondigitalocean.app/auth/verify-email/${emailVerificationToken}`;
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
        phone_verified: newUser.phone_verified,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// Firebase Signup/Login
exports.firebaseSignup = async (req, res) => {
  const role = "buyer";
  const { token: firebaseToken } = req.body;

  if (!firebaseToken || !role) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const { uid, email, name, picture } = decodedToken;

    if (role !== "buyer") {
      return res
        .status(400)
        .json({ message: "Google/Apple signup is only available for buyers." });
    }

    let existingUser = await User.findOne({ email, role });

    if (existingUser) {
      if (existingUser.account_type === "google") {
        const userJwt = generateToken(existingUser);
        existingUser.login_token = userJwt;
        existingUser.login_token_expiry = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await existingUser.save();

        return res.status(200).json({
          message: "User already exists, logged in successfully.",
          token: userJwt,
          user: {
            full_name: existingUser.full_name,
            email: existingUser.email,
            role: existingUser.role,
            profile_picture: existingUser.profile_picture,
            email_verified: existingUser.email_verified,
            phone_verified: existingUser.phone_verified,
          },
        });
      } else {
        return res.status(400).json({
          message: "User already exists with a different signup method.",
        });
      }
    } else {
      let imageUrl = picture || null;

      const newUser = new User({
        full_name: name || null,
        email,
        role,
        account_type: "google",
        profile_picture: imageUrl,
        phone_number: null,
        email_verified: true,
        account_status: "active",
        phone_verified: false,
      });

      await newUser.save();
      const userJwt = generateToken(newUser);

      return res.status(201).json({
        message: "User registered successfully and logged in.",
        token: userJwt,
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
    console.error("Firebase Signup Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// 🔹 Social Authentication (Google/Apple) - Only for Buyers
exports.socialAuth = async (req, res) => {
  const { email, name, login_type_id } = req.body;
  const role = "buyer"; // Enforce buyer role

  try {
    if (!email || !name || !login_type_id) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (!["google", "apple"].includes(login_type_id)) {
      return res.status(400).json({ message: "Invalid login type." });
    }

    let user = await User.findOne({ email, role, account_type: login_type_id });

    if (user) {
      const token = generateToken(user);
      user.login_token = token;
      user.login_token_expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await user.save();

      return res.status(200).json({
        message: "Login successful.",
        token,
        user: {
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          account_type: user.account_type,
          profile_picture: user.profile_picture,
        },
      });
    }

    // Upload profile picture to Cloudinary (if provided)
    let imageUrl = null;
    if (req.files && req.files["profile_picture"]) {
      const folderName = "buyers_profiles";
      imageUrl = await uploadToCloudinary(
        req.files["profile_picture"][0].buffer,
        folderName,
      );
    }

    // Register new user
    const newUser = new User({
      full_name: name,
      email,
      role,
      account_type: login_type_id,
      profile_picture: imageUrl,
      phone_number: null,
      email_verified: true,
      phone_verified: false,
      account_status: "active",
    });

    // Generate token for new user
    const token = generateToken(newUser);
    newUser.login_token = token;
    newUser.login_token_expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await newUser.save();

    return res.status(201).json({
      message: "Signup successful.",
      token,
      user: {
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        account_type: newUser.account_type,
        profile_picture: newUser.profile_picture,
      },
    });
  } catch (error) {
    console.error("Social Auth Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};
