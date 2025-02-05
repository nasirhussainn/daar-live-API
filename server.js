const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON requests
app.use(express.json());

// Welcome Route
app.get("/", (req, res) => {
  res.send("Welcome to Daar Live API! 🚀");
});

// Import routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}/`);
});
