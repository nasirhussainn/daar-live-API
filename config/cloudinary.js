const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload an image
const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "user_profiles", // Organizing files in a folder
      use_filename: true,
    });
    return result.secure_url; // Return the hosted image URL
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Upload failed");
  }
};

module.exports = { uploadToCloudinary };
