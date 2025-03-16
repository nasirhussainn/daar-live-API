const crypto = require("crypto");
const User = require("../../models/User"); // Import User model
const { sendVerificationEmail } = require("../../config/mailer"); // Import mailer function
require("dotenv").config();

const BASE_URL = process.env.BASE_URL;

/**
 * Verify email function
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by the verification token
    const user = await User.findOne({ email_verification_token: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification token." });
    }

    // Check if the token has expired
    if (user.email_verification_token_expiry < Date.now()) {
      // Generate a new token and expiry
      const newEmailVerificationToken = crypto.randomBytes(32).toString("hex");
      const newEmailVerificationTokenExpiry = Date.now() + 3600000; // 1 hour

      // Update user with new token and expiry
      user.email_verification_token = newEmailVerificationToken;
      user.email_verification_token_expiry = newEmailVerificationTokenExpiry;
      await user.save();

      // Send new verification email
      const newVerificationLink = `https://whale-app-4nsg6.ondigitalocean.app/auth/verify-email/${newEmailVerificationToken}`;
      await sendVerificationEmail(user.email, newVerificationLink);

      return res.status(400).json({
        message: "Verification token expired. A new verification link has been sent to your email.",
      });
    }

    // Update user to mark email as verified
    user.email_verified = true;
    user.email_verification_token = undefined; // Remove the token after verification
    user.email_verification_token_expiry = undefined; // Clear expiry date
    if(user.role === 'buyer'){
      user.account_status = "active";
    }

    await user.save();

    if(user.role === 'realtor'){
    return res.status(200).json({ message: "Email verified successfully! Your account will be reviewed by our team and you will receive an email once it's approved." });
    }else{
      return res.status(200).json({ message: "Email verified successfully!" });
    }
  } catch (error) {
    console.error("Email Verification Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

module.exports = { verifyEmail };
