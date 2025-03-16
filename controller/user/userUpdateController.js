const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const { uploadToCloudinary } = require("../../config/cloudinary");

exports.updateUser = async (req, res) => {
  try {
    const { _id, full_name, phone_number, business_name } = req.body;

    if (!_id) {
      return res.status(400).json({ message: "User ID is required to update user." });
    }

    let user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ message: `No user found with ID: ${_id}.` });
    }

    const role = user.role;
    let updatedFields = {};

    // Handle profile picture upload
    if (req.file) {
      const folderName = role === "realtor" ? "realtors_profiles" : "buyers_profiles";
      const imageUrl = await uploadToCloudinary(req.file.buffer, folderName);
      updatedFields.profile_picture = imageUrl;
    }

    if (role === "buyer") {
      if (full_name) updatedFields.full_name = full_name;
      if (phone_number) updatedFields.phone_number = phone_number;
    } else if (role === "realtor") {
      if (full_name) updatedFields.full_name = full_name;
      if (business_name) {
        let realtor = await Realtor.findOne({ user_id: _id });
        if (!realtor) {
          return res.status(400).json({ message: "Realtor details not found. Please create them separately." });
        }
        await Realtor.updateOne({ user_id: _id }, { $set: { business_name } });
        updatedFields.business_name = business_name;
      }
    }

    if (Object.keys(updatedFields).length > 0) {
      await User.updateOne({ _id }, { $set: updatedFields });
    }

    const updatedUser = await User.findById(_id);
    const updatedRealtor = role === "realtor" ? await Realtor.findOne({ user_id: _id }) : null;

    return res.status(200).json({
      message: "User updated successfully.",
      updated_fields: updatedFields,
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
};
