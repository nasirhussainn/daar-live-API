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
      return res.status(400).send(`
        <h2>Email Verification</h2>
        <p style="color:red;">Invalid or broken verification link.</p>
      `);
    }

    // Check if token has expired
    if (user.email_verification_token_expiry < Date.now()) {
      const newToken = crypto.randomBytes(32).toString("hex");
      const newExpiry = Date.now() + 3600000; // 1 hour

      user.email_verification_token = newToken;
      user.email_verification_token_expiry = newExpiry;
      await user.save();

      const newLink = `https://whale-app-4nsg6.ondigitalocean.app/auth/verify-email/${newToken}`;
      await sendVerificationEmail(user.email, newLink);

      return res.status(400).send(`
        <h2>Email Verification</h2>
        <p style="color:orange;">Your verification link has expired. A new link has been sent to your email.</p>
      `);
    }

    // Mark user as verified
    user.email_verified = true;
    user.email_verification_token = undefined;
    user.email_verification_token_expiry = undefined;

    if (user.role === "buyer") {
      user.account_status = "active";
    }

    await user.save();

    if (user.role === "realtor") {
      return res.send(`
        <h2>Email Verified</h2>
        <p style="color:green;">Your email has been verified successfully! Your account will be reviewed by our team. You will receive an email once it's approved.</p>
      `);
    } else {
      return res.send(`
        <h2>Email Verified</h2>
        <p style="color:green;">Your email has been verified successfully! You can now log in.</p>
      `);
    }
  } catch (error) {
    console.error("Email Verification Error:", error);
    return res.status(500).send(`
      <h2>Server Error</h2>
      <p style="color:red;">Something went wrong. Please try again later.</p>
    `);
  }
};


module.exports = { verifyEmail };
