require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (buffer) => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "upload_daar_live", // Directory name in Cloudinary
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    
    if (!buffer) {
      return reject(new Error("File buffer is empty"));
    }

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Upload multiple files (images or videos) to Cloudinary
const uploadMultipleToCloudinary = async (files, folderName) => {

  const mediaUrls = {
    images: [],
    videos: [],
  };

  // Loop through the files and upload them to Cloudinary
  for (const file of files) {
    const { buffer, fieldname } = file;

    // If it's an image
    if (fieldname === 'images') {
      const imageUrl = await uploadToCloudinary(buffer, folderName);
      mediaUrls.images.push(imageUrl);
    }

    // If it's a video
    if (fieldname === 'videos') {
      const videoUrl = await uploadToCloudinary(buffer, folderName);
      mediaUrls.videos.push(videoUrl);
    }
  }

  return mediaUrls; // Return the URLs for images and videos
};

// Upload function
const uploadToCloudinaryChat = async (buffer, folderName = "uploads") => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream(
      { resource_type: "auto", folder: folderName },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Separate function for chat media uploads
const uploadChatMedia = async (buffer, messageType) => {
  let folderName = messageType === "image" ? "chat_images" : messageType === "voice" ? "chat_voice" : "chat_media";
  return uploadToCloudinaryChat(buffer, folderName);
};


module.exports = { uploadToCloudinary, uploadMultipleToCloudinary, uploadChatMedia, uploadToCloudinaryChat };
