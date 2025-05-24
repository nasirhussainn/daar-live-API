const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: { type: String, required: false },
    full_name: { type: String, required: false },
    password: { type: String },
    phone_number: { type: String },
    profile_picture: { type: String },
    role: { type: String, enum: ["buyer", "realtor"], required: true },
    account_type: {
      type: String,
      enum: ["manual", "google", "apple", "phone"],
      required: true,
    },
    email_verified: { type: Boolean, default: false },
    email_verification_token: { type: String }, // Token for email verification
    email_verification_token_expiry: { type: Date }, // Expiry of verification token
    password_reset_token: { type: String }, // Token for password reset
    password_reset_token_expiry: { type: Date }, // Expiry of password reset token
    phone_verified: { type: Boolean, default: false }, // To track phone number verification status
    phone_otp: { type: String }, // OTP for phone verification
    phone_otp_expiry: { type: Date }, // Expiry of OTP
    login_token: { type: String }, // OTP for phone verification
    login_token_expiry: { type: Date }, // Expiry of OTP
    account_status: {
      type: String,
      enum: ["pending", "approved", "declined", "active"],
      default: "pending",
    },
  },
  { timestamps: true }, // Automatically adds `createdAt` and `updatedAt` timestamps
);

const User = mongoose.model("User", userSchema);
module.exports = User;
