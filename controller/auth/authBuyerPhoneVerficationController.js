const twilio = require("twilio");
const User = require("../../models/User"); // Adjust the path if needed

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.VERIFY_SERVICE_ID;

const client = twilio(accountSid, authToken);

exports.sendOTPBuyer = async (req, res) => {
  const { phone_number } = req.body;
  const client = require("twilio")(accountSid, authToken);

    if (!phone_number) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins from now

    try {
      // Send OTP via SMS
      await client.messages.create({
        body: `Your verification code is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone_number
      });

    //   Store OTP & expiry in DB (upsert = insert if not exists)
      const user = await User.findOneAndUpdate(
        { phone_number },
        {
          phone_number,
          phone_otp: otp.toString(),
          phone_otp_expiry: otpExpiry,
          phone_verified: false,
        },
        { upsert: true, new: true }
      );

      console.log(`OTP for ${phone_number}: ${otp}`);

      return res.status(200).json({ message: 'OTP sent successfully.', phone_number });
    } catch (err) {
      console.error('Error sending OTP:', err.message);
      return res.status(500).json({ message: 'Failed to send OTP.' });
    }
};

// Verify OTP
exports.verifyOTPBuyer = async (req, res) => {
  const { phone_number, code } = req.body;

  if (!phone_number || !code) {
    return res
      .status(400)
      .json({ message: "Phone number and OTP code are required." });
  }

  try {
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone_number, code });

    if (verificationCheck.status === "approved") {
      // Optional: You can now log the user in or mark the phone_verified field
      const user = await User.findOneAndUpdate(
        { phone_number },
        { phone_verified: true },
        { new: true }
      );

      return res
        .status(200)
        .json({ message: "Phone verified successfully.", user });
    } else {
      return res.status(401).json({ message: "Invalid or expired OTP." });
    }
  } catch (err) {
    console.error("Error verifying OTP:", err.message);
    return res.status(500).json({ message: "Failed to verify OTP." });
  }
};
