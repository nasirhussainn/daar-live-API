const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const { upload } = require("../../middlewares/multerConfig");
const { uploadToCloudinary } = require("../../config/cloudinary");

router.put("/update", upload.single("profilePicture"), async (req, res) => {
  try {
    const { _id, full_name, phone_number, business_name } = req.body;

    // Ensure _id is provided
    if (!_id) {
      return res.status(400).json({ message: "User ID is required to update user." });
    }

    // Find the user by _id
    let user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ message: `No user found with ID: ${_id}.` });
    }

    const role = user.role; // Determine role dynamically
    let updatedFields = {}; // Object to track changes

    // Handle profile picture update (if provided)
    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.buffer);
      updatedFields.profile_picture = imageUrl;
    }

    // Update user fields based on role
    if (role === "buyer") {
      if (full_name) updatedFields.full_name = full_name;
      if (phone_number) updatedFields.phone_number = phone_number;
    } else if (role === "realtor") {
      if (full_name) updatedFields.full_name = full_name;
      if (business_name) {
        // Update business name in Realtor model
        let realtor = await Realtor.findOne({ user_id: _id });
        if (!realtor) {
          return res.status(400).json({ message: "Realtor details not found. Please create them separately." });
        }
        await Realtor.updateOne({ user_id: _id }, { $set: { business_name } });
        updatedFields.business_name = business_name;
      }
    }

    // Apply updates only if there are changes
    if (Object.keys(updatedFields).length > 0) {
      await User.updateOne({ _id }, { $set: updatedFields });
    }

    // Fetch updated user data
    const updatedUser = await User.findById(_id);
    const updatedRealtor = role === "realtor" ? await Realtor.findOne({ user_id: _id }) : null;

    return res.status(200).json({
      message: "User updated successfully.",
      updated_fields: updatedFields, // Show exactly what was updated
      user: {
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        phone_number: updatedUser.phone_number,
        role: updatedUser.role,
        profile_picture: updatedUser.profile_picture,
      },
      realtor_details: updatedRealtor ? { business_name: updatedRealtor.business_name } : null,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

module.exports = router;
