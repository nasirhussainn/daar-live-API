const express = require("express");
const router = express.Router();
const { signup, firebaseSignup, socialAuth } = require("../../controller/auth/authSignupController");
const { uploadSignup } = require("../../middlewares/multerConfig")

// Signup Route (Manual)
router.post("/signup", uploadSignup, signup);

// Firebase Signup Route
router.post("/firebase-signup", firebaseSignup);

// Social Auth Route
router.post("/social", uploadSignup, socialAuth);

module.exports = router;
