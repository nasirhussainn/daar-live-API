const twilio = require("twilio");
const User = require("../../models/User");
const { generateTokenPhone } = require("../../config/jwt"); // JWT helper function

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

exports.sendOTPBuyer = async (req, res) => {
  const { phone_number } = req.body;
  const client = require("twilio")(accountSid, authToken);

  if (!phone_number) {
    return res.status(400).json({ message: "Phone number is required." });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins from now

  try {
    // Send OTP via SMS
    await client.messages.create({
      body: `Dear User,

Thank you for using Daar Live. 

Your verification code is: ${otp}

Please enter this code to verify your phone number. This code will expire in 5 minutes, so make sure to use it promptly.

If you didn't request this code, please ignore this message. 

Best regards,  
The Daar Live Team  
`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone_number,
    });

    //   Store OTP & expiry in DB (upsert = insert if not exists)
    const user = await User.findOneAndUpdate(
      { phone_number },
      {
        phone_number,
        phone_otp: otp.toString(),
        phone_otp_expiry: otpExpiry,
      },
      { upsert: true, new: true }
    );

    return res
      .status(200)
      .json({ message: "OTP sent successfully.", phone_number });
  } catch (err) {
    console.error("Error sending OTP:", err.message);
    return res.status(500).json({ message: "Failed to send OTP." });
  }
};

// Verify OTP

exports.verifyOTPBuyer = async (req, res) => {
  const { phone_number, code } = req.body;

  let account_completion = false;
  if (!phone_number || !code) {
    return res
      .status(400)
      .json({ message: "Phone number and OTP code are required." });
  }

  try {
    const user = await User.findOne({ phone_number });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Validate OTP and expiry
    if (
      user.phone_otp !== code ||
      !user.phone_otp_expiry ||
      user.phone_otp_expiry < Date.now()
    ) {
      return res.status(401).json({ message: "Invalid or expired OTP." });
    }

    // Set role to 'buyer' if not already defined
    const previousStatus = user.account_status;
    if (!user.role) user.role = "buyer";
    if (user.account_status === "pending") {
      user.account_status = "active";
      user.phone_verified = true;
    }
    if (!user.account_type) user.account_type = "phone";

    // Mark phone verified and clear OTP
    user.phone_otp = undefined;
    user.phone_otp_expiry = undefined;

    // Check existing login token
    const now = new Date();
    if (!user.login_token || user.login_token_expiry <= now) {
      user.login_token = generateTokenPhone(user);
      user.login_token_expiry = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000
      ); // 7 days
    }

    await user.save();

    const basicUserInfo = {
      phone_number: user.phone_number,
      full_name: user.full_name,
      role: user.role,
      _id: user._id,
    };

    let responseMessage;

    if (previousStatus === "pending") {
      responseMessage =
        "Account created successfully. Please complete your profile.";
    } else if (
      user.account_status === "active" &&
      (!user.full_name || !user.email)
    ) {
      responseMessage = "Login successful. Please complete your profile.";
    } else {
      account_completion = true;
      responseMessage = "Login successful.";
    }

    return res.status(200).json({
      message: responseMessage,
      token: user.login_token,
      user: basicUserInfo,
      account_completion: account_completion,
    });
  } catch (err) {
    console.error("Error verifying OTP:", err.message);
    return res.status(500).json({ message: "Failed to verify OTP." });
  }
};
