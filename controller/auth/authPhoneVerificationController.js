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

// Send OTP
exports.sendOTP = async (req, res) => {
  const role = "realtor";
  const { email, phone_number } = req.body;

  try {
    const user = await User.findOne({ email, role });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "realtor") {
      return res
        .status(403)
        .json({ message: "Phone verification is only for realtors" });
    }

    if (!phone_number) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const existingUser = await User.findOne({
      phone_number,
      role,
      email: { $ne: email },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Phone number is already in use by another realtor" });
    }

    if (!user.email_verified) {
      return res.status(400).json({ message: "Email not verified yet" });
    }

    if (user.phone_otp_expiry && user.phone_otp_expiry > new Date()) {
      return res
        .status(400)
        .json({
          message: "OTP already sent, please wait before requesting a new one",
        });
    }

    const otp = generateOTP();
    user.phone_otp = otp;
    user.phone_otp_expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    user.phone_number = phone_number;

    await user.save();

    await twilioClient.messages.create({
      body: `Your verification OTP is: ${otp}`,
      messagingServiceSid: messagingServiceSid,
      to: phone_number,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  exports.sendOTP(req, res);
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  const { email, phone_otp } = req.body;

  try {
    const user = await User.findOne({ email, phone_otp });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "realtor") {
      return res
        .status(403)
        .json({ message: "Phone verification is only for realtors" });
    }

    if (!user.email_verified) {
      return res.status(400).json({ message: "Email not verified yet" });
    }

    if (!user.phone_otp || user.phone_otp !== phone_otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.phone_otp_expiry < new Date()) {
      return res
        .status(400)
        .json({ message: "OTP expired, request a new one" });
    }

    user.phone_verified = true;
    user.phone_otp = null;
    user.phone_otp_expiry = null;
    await user.save();

    res.json({ message: "Phone number verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
