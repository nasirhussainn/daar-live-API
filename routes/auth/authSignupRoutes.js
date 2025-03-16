const express = require("express");
const router = express.Router();
const { signup, firebaseSignup } = require("../../controller/auth/authSignupController");
const { uploadSignup } = require("../../middlewares/multerConfig")

// Signup Route (Manual)
router.post("/signup", uploadSignup, signup);

// Firebase Signup Route
router.post("/firebase-signup", firebaseSignup);

module.exports = router;
