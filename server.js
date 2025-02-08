const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all domains
app.use(cors({ origin: "*", credentials: true }));

// Set Security Headers (Allow Popups & Cross-Origin Requests)
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");  
  res.setHeader("Cross-Origin-Embedder-Policy", "cross-origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Welcome Route
app.get("/", (req, res) => {
  res.send("Welcome to Daar Live API! 🚀");
});

// Import Routes
const authSignup = require("./routes/auth/authSignup");
const authPassword = require("./routes/auth/authPassword");
const authEmailVerification = require("./routes/auth/authEmailVerification");
const authLogin = require("./routes/auth/authLogin");
const authPhoneVerification = require("./routes/auth/authPhoneVerification");

app.use("/auth", authSignup);
app.use("/auth", authPassword);
app.use("/auth", authEmailVerification);
app.use("/auth", authLogin);
app.use("/auth", authPhoneVerification);

// Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}/`);
});
