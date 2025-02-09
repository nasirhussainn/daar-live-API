const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const twilio = require("twilio");
const crypto = require("crypto");

// Twilio Credentials (Store in environment variables)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);
const messagingServiceSid = process.env.MESSAGING_SERVICE_ID;

// Function to generate a 6-digit OTP
function generateOTP() {
  return crypto.randomInt(1000, 9999).toString();
}

// Send OTP API
router.post("/send-otp", async (req, res) => {
  role = 'realtor'
  const { email } = req.body;

  try {
    const user = await User.findOne({ email, role });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure only realtors can verify phone
    if (user.role !== "realtor") {
      return res.status(403).json({ message: "Phone verification is only for realtors" });
    }

    // Ensure email is verified before sending OTP
    if (!user.email_verified) {
      return res.status(400).json({ message: "Email not verified yet" });
    }

    // Prevent sending OTP if one is already active and not expired
    const now = new Date();
    if (user.phone_otp_expiry && user.phone_otp_expiry > now) {
      return res.status(400).json({ message: "OTP already sent, please wait before requesting a new one" });
    }

    // Generate and store OTP with expiry (5 minutes)
    const otp = generateOTP();
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);    // 5 minutes from now
    user.phone_otp = otp;
    user.phone_otp_expiry = expiryTime;
    await user.save();

    // Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your verification OTP is: ${otp}`,
      from: '+18314003458',
      to: '+923165392101'
    });

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Resend OTP API
router.post("/resend-otp", async (req, res) => {
  role = 'realtor'
  const { email } = req.body;

  try {
    const user = await User.findOne({ email, role });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure only realtors can verify phone
    if (user.role !== "realtor") {
      return res.status(403).json({ message: "Phone verification is only for realtors" });
    }

    // Ensure email is verified before sending OTP
    if (!user.email_verified) {
      return res.status(400).json({ message: "Email not verified yet" });
    }

    // Prevent sending OTP if one is already active and not expired
    const now = new Date();
    if (user.phone_otp_expiry && user.phone_otp_expiry > now) {
      return res.status(400).json({ message: "OTP already sent, please wait before requesting a new one" });
    }

    // Generate and store OTP with expiry (5 minutes)
    const otp = generateOTP();
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);    // 5 minutes from now
    user.phone_otp = otp;
    user.phone_otp_expiry = expiryTime;
    await user.save();

    // Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your New verification OTP is: ${otp}`,
      from: '+18314003458',
      to: '+923165392101'
    });

    res.json({ message: "New OTP sent successfully" });
  } catch (error) {
    console.error("Error sending new OTP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { email, phone_otp } = req.body;

  try {
    const user = await User.findOne({ email, phone_otp });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure only realtors can verify phone
    if (user.role !== "realtor") {
      return res.status(403).json({ message: "Phone verification is only for realtors" });
    }

    // Ensure email is verified before OTP verification
    if (!user.email_verified) {
      return res.status(400).json({ message: "Email not verified yet" });
    }

    // Check if OTP is correct and not expired
    if (!user.phone_otp || user.phone_otp !== phone_otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    if (user.phone_otp_expiry < new Date()) {
      return res.status(400).json({ message: "OTP expired, request a new one" });
    }

    // Mark phone number as verified
    user.phone_verified = true;
    user.phone_otp = null; // Clear OTP
    user.phone_otp_expiry = null;
    await user.save();

    res.json({ message: "Phone number verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
