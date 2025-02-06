const jwt = require('jsonwebtoken');
const User = require('../models/User'); // User model

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Get token from Authorization header

  if (!token) {
    return res.status(403).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded; // Attach user data to request
    next(); // Pass control to the next route handler
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(400).json({ message: "Invalid or expired token." });
  }
};

module.exports = { verifyToken };
