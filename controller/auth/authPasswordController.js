const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const path = require("path");
const User = require("../../models/User");
const { sendPasswordResetEmail } = require("../../config/mailer");

// Forgot Password Controller
exports.forgotPassword = async (req, res) => {
  const { email, role } = req.body;

  try {
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required." });
    }

    const user = await User.findOne({ email, role });

    if (!user || user.account_type !== "manual") {
      return res.status(400).json({ message: "No user found with this email, role & account type combination." });
    }

    if (!user.email_verified) {
      return res.status(403).json({ message: "Email not verified. Please verify your email before requesting a password reset." });
    }

    if (role === "realtor" && !user.phone_verified) {
      return res.status(403).json({ message: "Phone number not verified. Please verify your phone number before requesting a password reset." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // Valid for 1 hour

    user.password_reset_token = resetToken;
    user.password_reset_token_expiry = resetTokenExpiry;
    await user.save();

    const resetLink = `https://daar-live-api.vercel.app/auth/reset-password-page/${resetToken}`;

    await sendPasswordResetEmail(email, resetLink);

    return res.status(200).json({ message: "Password reset link sent to your email." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// Serve Reset Password Page
exports.resetPasswordPage = (req, res) => {
  const filePath = path.join(__dirname, "../../views", "reset-password.html");
  res.sendFile(filePath);
};

// Reset Password Controller
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({ password_reset_token: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid password reset token." });
    }

    if (user.password_reset_token_expiry < Date.now()) {
      const newResetToken = crypto.randomBytes(32).toString("hex");
      const newResetTokenExpiry = Date.now() + 3600000; // Valid for 1 hour

      user.password_reset_token = newResetToken;
      user.password_reset_token_expiry = newResetTokenExpiry;
      await user.save();

      const resetLink = `https://daar-live-api.vercel.app/auth/reset-password-page/${newResetToken}`;
      await sendPasswordResetEmail(user.email, resetLink);

      return res.status(400).json({ message: "Your password reset token expired. A new link has been sent to your email." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.password_reset_token = undefined;
    user.password_reset_token_expiry = undefined;
    await user.save();

    return res.status(200).json({ message: "Password has been successfully reset." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};
