const mongoose = require('mongoose');
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../config/cloudinary");
const { translateText } = require("../../services/translateService")

exports.updateUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction(); // Start transaction

    const userId = req.params.userId;
    const { full_name, email, phone_number, business_type } = req.body;

    const business_name = await translateText(req.body.business_name)
    // Fetch existing user
    let user = await User.findById(userId).session(session);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if email is already taken (excluding current user)
    if (email && email !== user.email) {
      let existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use." });
      }
      user.email_verified = false; // Mark email as unverified if changed
    }

    // Profile Picture Handling
    let imageUrl = user.profile_picture;
    if (req.files && req.files["profile_picture"]) {
      const folderName = user.role === "realtor" ? "realtors_profiles" : "buyers_profiles";

      // Upload new image
      imageUrl = await uploadToCloudinary(req.files["profile_picture"][0].buffer, folderName);

      // Delete old image if exists
      if (user.profile_picture) {
        await deleteFromCloudinary(user.profile_picture);
      }
    }

    // Update user details
    user.full_name = full_name || user.full_name;
    user.email = email || user.email;
    user.phone_number = phone_number || user.phone_number;
    user.profile_picture = imageUrl;

    await user.save({ session });

    // Handle realtor-specific updates
    if (user.role === "realtor") {
      let realtor = await Realtor.findOne({ user_id: userId }).session(session);
      if (!realtor) {
        return res.status(404).json({ message: "Realtor profile not found." });
      }

      // Business documents handling
      let taxIdImageUrl = realtor.tax_id_image;
      let verificationDocImageUrl = realtor.verification_doc_image;

      if (req.files) {
        if (req.files["tax_id_image"]) {
          taxIdImageUrl = await uploadToCloudinary(req.files["tax_id_image"][0].buffer, "realtors_documents");
          if (realtor.tax_id_image) await deleteFromCloudinary(realtor.tax_id_image);
        }
        if (req.files["verification_doc_image"]) {
          verificationDocImageUrl = await uploadToCloudinary(req.files["verification_doc_image"][0].buffer, "realtors_documents");
          if (realtor.verification_doc_image) await deleteFromCloudinary(realtor.verification_doc_image);
        }
      }

      // Update realtor details
      realtor.business_name = business_name || realtor.business_name;
      realtor.business_type = business_type || realtor.business_type;
      realtor.tax_id_image = taxIdImageUrl;
      realtor.verification_doc_image = verificationDocImageUrl;

      await realtor.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "User updated successfully.",
      user: {
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        profile_picture: user.profile_picture,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
      },
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

