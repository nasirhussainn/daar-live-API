const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const { getAuth } = require("firebase-admin/auth");
const { initializeSocket } = require("./config/socket"); 
// const redisSubscriber = require("./config/redisSubscriber");
const http = require("http");
require("./jobs/bookingCron");
require("./jobs/subscriptionCron"); // This will execute the cron job from the imported file
require("./jobs/eventCron");

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

const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Welcome Route
app.get("/", (req, res) => {
  res.send("Welcome to Daar Live API! 🚀");
});

// Translation
app.use("/api/translate", require("./routes/translate")); // This will import the Translate rout
// Import Routes (other routes)
// const authPassword = require("./routes/auth/authPassword");
// const authEmailVerification = require("./routes/auth/authEmailVerification");
// const authLogin = require("./routes/auth/authLogin");
// const authPhoneVerification = require("./routes/auth/authPhoneVerification");
// const authSignup = require("./routes/auth/authSignup");
const authEmailVerificationRoutes = require("./routes/auth/authEmailVerificationRoutes");
const authLoginRoutes = require("./routes/auth/authLoginRoutes");
const authPasswordRoutes = require("./routes/auth/authPasswordRoutes");
const authPhoneVerificationRoutes = require("./routes/auth/authPhoneVerificationRoutes");
const authSignupRoutes = require("./routes/auth/authSignupRoutes");

// const userGET = require("./routes/userCRUD/getUsers");
// const userUPDATE = require("./routes/userCRUD/updateUsers");
const userGetRoutes = require("./routes/userRoutes/userGetRoutes");
const userUpdateRoutes = require("./routes/userRoutes/userUpdateRoutes");

const propertyTypeRoutes = require("./routes/propertyFacilities/propertyTypeRoutes");
const propertySubtypeRoutes = require("./routes/propertyFacilities/propertySubtypeRoutes");
const eventTypeRoutes = require("./routes/propertyFacilities/eventTypeRoutes");
const amenitiesRoutes = require("./routes/propertyFacilities/amenitiesRoutes");

const propertyRoutes = require("./routes/property/propertyRoutes");
const savedPropertyRoutes = require("./routes/property/savedPropertyRoutes");
const eventRoutes = require("./routes/event/eventRoutes");
const reviewRoutes = require("./routes/review/reviewRoutes");
const subscriptionRoute = require("./routes/subscription/subscriptionRoute");

const adminSettingRoute = require("./routes/admin/adminSettingRoutes");
const admin = require("./routes/admin/adminRoutes");

const locationRoute = require('./routes/location');
const subscriptionPlanRoutes = require('./routes/subscription/subscriptionPlanRoutes');

const chatRoutes = require("./routes/chat/chatRoutes")(io);

const contactUsRoutes = require("./routes/admin/contactUsRoutes");

const approvalRoutes = require("./routes/approval/approvalRoutes")

const propertyBookingRoutes = require("./routes/booking/propertyBookingRoutes")
const eventBookingRoutes = require("./routes/booking/eventBookingRoutes")
const checkInOutRoutes = require("./routes/booking/checkInOutRoutes")

const realtorHostStatRoutes = require("./routes/stats/realtorHostStatRoutes");
const subscriptionStatRoutes = require("./routes/stats/subscriptionStatRoutes");

const notificationRoutes = require("./routes/notification/notificationRoutes");
const paymentHistoryRoutes = require("./routes/payment/paymentHistoryRoutes")

const userApprovalRoutes = require("./routes/admin/userApprovalRoutes");

const realtorRoutes = require("./routes/realtor/realtorRoutes")

const withdrawRoutes = require("./routes/withdraw/withdrawRoutes")

const analyticRoutes = require("./routes/analytic/analyticRoutes")

app.use("/auth", [
  authLoginRoutes,
  authEmailVerificationRoutes,
  authPasswordRoutes,
  authPhoneVerificationRoutes,
  authSignupRoutes,
  // authSignup,
  // authPassword,
  // authEmailVerification,
  // authLogin,
  // authPhoneVerification,
]);

app.use("/crud-users", 
  [
    // userGET, 
    // userUPDATE,
    userGetRoutes,
    userUpdateRoutes,

  ]);

app.use("/property-facilities", [
  propertyTypeRoutes,
  propertySubtypeRoutes,
  eventTypeRoutes,
  amenitiesRoutes,
]);

app.use("/property", [propertyRoutes, savedPropertyRoutes, propertyBookingRoutes]);

app.use("/event", [eventRoutes, eventBookingRoutes, checkInOutRoutes]);

app.use("/review", [reviewRoutes]);

app.use("/realtor", [subscriptionRoute, realtorRoutes]);

app.use("/admin-settings", [adminSettingRoute]);
app.use("/admin", [admin])

app.use("/location-search", locationRoute);

app.use("/plan", subscriptionPlanRoutes);

app.use("/chat", chatRoutes);

app.use("/contact-admin", contactUsRoutes);
// redisSubscriber(io);

app.use("/approval", [approvalRoutes, userApprovalRoutes]);

app.use("/stats", [subscriptionStatRoutes, realtorHostStatRoutes]);

app.use("/notifications", notificationRoutes);
app.use("/payment-history", paymentHistoryRoutes);

app.use("/withdraw", withdrawRoutes);

app.use("/analytic", analyticRoutes);

app.use("/check-in-out", checkInOutRoutes)
// Start the Server
server.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}/`);
});

