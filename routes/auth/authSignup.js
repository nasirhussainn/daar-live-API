const express = require("express");
const router = express.Router();
const admin = require("../../../firebase"); // Firebase setup

// Manual Signup (Email/Password)
router.post("/signup", (req, res) => {
  const { name, email, password, role } = req.body; // role: 'buyer' or 'realtor'

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Simulate storing the user in the database
  const user = {
    name,
    email,
    password, // In reality, password should be hashed and stored securely
    role,
  };

  return res.status(201).json({
    message: "User registered successfully",
    user,
  });
});

// Manual Login (Email/Password)
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Simulate checking the user's credentials (in reality, you'd check the DB)
  const user = { email, password, role: "buyer" }; // Example user

  if (user) {
    return res.status(200).json({
      message: "Login successful",
      user,
    });
  } else {
    return res.status(401).json({ message: "Invalid credentials" });
  }
});

// Firebase Sign-Up/Sign-In with Google/Apple
router.post("/signup/firebase", async (req, res) => {
  const { idToken, role } = req.body; // ID Token from frontend

  if (!idToken || !role) {
    return res.status(400).json({ message: "ID Token and role are required" });
  }

  try {
    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // Simulating user registration (Replace with database logic)
    const user = {
      uid,
      name: name || "No Name",
      email,
      picture,
      role, // 'buyer' or 'realtor'
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
