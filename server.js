const express = require("express");
const connectDB = require('./config/db'); 

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON requests
app.use(express.json());

// Connect to MongoDB
connectDB();

// Welcome Route
app.get("/", (req, res) => {
  res.send("Welcome to Daar Live API! 🚀");
});

// Import routes
const authSignup = require("./routes/auth/authSignup");
const authPassword = require("./routes/auth/authPassword")
const authEmailVerification = require("./routes/auth/authEmailVerification")
app.use("/auth", authSignup);
app.use("/auth", authPassword);
app.use("/auth", authEmailVerification)
// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}/`);
});
