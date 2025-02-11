const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const upload = require("../../middlewares/multerConfig"); 
const uploadToCloudinary  = require("../../config/cloudinary");

router.put("/update", upload.single("profilePicture"), async (req, res) => {
  try {
    const {
      email,
      role,
      full_name,
      password,
      phone_number,
      business_name,
      customer_id,
      subscription, // Accept subscription from request body
    } = req.body;

    // Ensure email and role are provided
    if (!email || !role) {
      return res
        .status(400)
        .json({ message: "Email and role are required to update user." });
    }

    // Find the user by email and role
    let user = await User.findOne({ email, role });
    if (!user) {
      return res
        .status(404)
        .json({
          message: `No user found with the email: ${email} and role: ${role}.`,
        });
    }

    // Validate required fields for realtors
    if (role === "realtor") {
      if (!phone_number) {
        return res
          .status(400)
          .json({ message: "Phone number is required for realtors." });
      }
      if (!business_name || !customer_id) {
        return res
          .status(400)
          .json({
            message: "Business name and customer ID are required for realtors.",
          });
      }

      // If the phone number is being updated, set phone_verified to false
      if (phone_number !== user.phone_number) {
        user.phone_verified = false; // Mark phone as unverified if the number changes
      }
    }

    // Handle profile picture update (if provided)
    let imageUrl = user.profile_picture;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer);
    }

    // Update User details
    user.full_name = full_name || user.full_name;
    user.password = password ? await bcrypt.hash(password, 10) : user.password;
    user.phone_number = phone_number || user.phone_number;
    user.profile_picture = imageUrl;
    user.role = role || user.role;

    await user.save();

    // If the user is a realtor, update their realtor details
    if (role === "realtor") {
      let realtor = await Realtor.findOne({ user_id: user._id });

      if (!realtor) {
        return res
          .status(400)
          .json({
            message:
              "Realtor details not found. Please create them separately.",
          });
      }

      // Update existing Realtor details
      realtor.business_name = business_name || realtor.business_name;
      realtor.customer_id = customer_id || realtor.customer_id;

      if (subscription) {
        realtor.subscription = {
          plan_name: subscription.plan_name || realtor.subscription.plan_name,
          start_date: subscription.start_date
            ? new Date(subscription.start_date)
            : realtor.subscription.start_date,
          end_date: subscription.end_date
            ? new Date(subscription.end_date)
            : realtor.subscription.end_date,
          status: subscription.status || realtor.subscription.status,
        };
      }

      await realtor.save();
    }

    // Return updated data
    return res.status(200).json({
      message: "User updated successfully.",
      user: {
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        profile_picture: user.profile_picture,
        phone_verified: user.phone_verified, // Updated status
      },
      realtor_details:
        role === "realtor"
          ? await Realtor.findOne({ user_id: user._id })
          : null,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

module.exports = router;
