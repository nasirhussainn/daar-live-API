const bcrypt = require("bcryptjs");
const { generateToken } = require("../../config/jwt"); // JWT helper function
const User = require("../../models/User"); // User model
const admin = require("firebase-admin"); // Firebase Admin SDK

// Regular Login
exports.login = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Email, password, and role are required." });
    }

    const user = await User.findOne({ email, role });
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found with this role." });

    if (!user.email_verified) {
      return res
        .status(403)
        .json({
          message:
            "Email not verified. Please verify your email before logging in.",
        });
    }

    if (role === "realtor" && user.account_status !== "active") {
      if (user.account_status === "pending") {
        return res
          .status(403)
          .json({
            message:
              "Account is pending. Please wait for approval before logging in.",
          });
      }
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch)
      return res.status(400).json({ message: "Invalid password." });

    // Check if token exists and is still valid
    const now = new Date();
    if (user.login_token && user.login_token_expiry > now) {
      return res.status(200).json({
        message: "Login successful.",
        token: user.login_token,
        user: { email: user.email, full_name: user.full_name, role: user.role },
      });
    }

    // Generate a new token if none exists or if expired
    const token = generateToken(user);
    user.login_token = token;
    user.login_token_expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Token valid for 7 days
    await user.save();

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: { email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// Firebase Login
exports.firebaseLogin = async (req, res) => {
  const role = "buyer";
  const { idToken } = req.body;

  if (!idToken || !role) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture: imageUrl } = decodedToken;

    if (role !== "buyer") {
      return res
        .status(400)
        .json({ message: "Google/Apple login is only available for buyers." });
    }

    let existingUser = await User.findOne({ email, role });

    if (existingUser) {
      if (!existingUser.email_verified) {
        return res.status(400).json({ message: "Email not verified." });
      }

      if (existingUser.account_type === "google") {
        const token = generateToken(existingUser);
        existingUser.login_token = token;
        existingUser.login_token_expiry = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await existingUser.save();

        return res.status(200).json({
          message: "Login successful.",
          token,
          user: {
            email: existingUser.email,
            full_name: existingUser.full_name,
            role: existingUser.role,
            account_type: existingUser.account_type,
          },
        });
      } else {
        return res.status(400).json({
          message: `User exists with ${existingUser.account_type} account. Please use the correct login method.`,
        });
      }
    } else {
      const newUser = new User({
        full_name: name,
        email,
        role,
        account_type: "google",
        profile_picture: imageUrl,
        phone_number: null,
        email_verified: true,
        phone_verified: false,
      });

      await newUser.save();

      return res.status(201).json({
        message: "User registered successfully",
        user: {
          full_name: newUser.full_name,
          email: newUser.email,
          role: newUser.role,
          account_type: newUser.account_type,
          profile_picture: newUser.profile_picture,
        },
      });
    }
  } catch (error) {
    console.error("Firebase Login Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};
