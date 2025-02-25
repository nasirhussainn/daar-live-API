const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const { getAuth } = require("firebase-admin/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for specific origin
app.use(cors({ origin: "*" }));

// Set Security Headers
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB().catch((err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1); // Exit if connection fails
});

// Welcome Route
app.get("/", (req, res) => {
  res.send("Welcome to Daar Live API! 🚀");
});

// Import Routes (other routes)
const authPassword = require("./routes/auth/authPassword");
const authEmailVerification = require("./routes/auth/authEmailVerification");
const authLogin = require("./routes/auth/authLogin");
const authPhoneVerification = require("./routes/auth/authPhoneVerification");
const authSignup = require("./routes/auth/authSignup");

const userGET = require("./routes/userCRUD/getUsers");
const userUPDATE = require("./routes/userCRUD/updateUsers");

const propertyTypeRoutes = require("./routes/propertyFacilities/propertyTypeRoutes");
const propertySubtypeRoutes = require("./routes/propertyFacilities/propertySubtypeRoutes");
const eventTypeRoutes = require("./routes/propertyFacilities/eventTypeRoutes");
const amenitiesRoutes = require("./routes/propertyFacilities/amenitiesRoutes");

const propertyRoutes = require("./routes/property/propertyRoutes");
const eventRoutes = require("./routes/event/eventRoutes");
const reviewRoutes = require("./routes/review/reviewRoutes");
const subscriptionRoute = require("./routes/subscription/subscriptionRoute");

const adminSettingRoute = require("./routes/admin/adminSettingRoutes");
const admin = require("./routes/admin/adminRoutes");

app.use("/auth", [
  authSignup,
  authPassword,
  authEmailVerification,
  authLogin,
  authPhoneVerification,
]);

app.use("/crud-users", [userGET, userUPDATE]);

app.use("/property-facilities", [
  propertyTypeRoutes,
  propertySubtypeRoutes,
  eventTypeRoutes,
  amenitiesRoutes,
]);

app.use("/property", [propertyRoutes]);

app.use("/event", [eventRoutes]);

app.use("/review", [reviewRoutes]);

app.use("/realtor", [subscriptionRoute]);

app.use("/admin-settings", [adminSettingRoute]);
app.use("/admin", [admin])


// Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}/`);
});
