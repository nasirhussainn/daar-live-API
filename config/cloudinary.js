require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (buffer, folder) => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: folder,
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

    const updatedFolderName = `${folderName}/${fieldname}`;
    // If it's an image
    if (fieldname === 'images') {
      const imageUrl = await uploadToCloudinary(buffer, updatedFolderName);
      mediaUrls.images.push(imageUrl);
    }

    // If it's a video
    if (fieldname === 'videos') {
      const videoUrl = await uploadToCloudinary(buffer, updatedFolderName);
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

/**
 * Deletes a file from Cloudinary using its URL
 * @param {string} url - The Cloudinary URL of the file to delete
 * @returns {Promise<void>}
 * @throws {Error} If deletion fails
 */
const deleteFromCloudinary = async (url) => {
  try {
    if (!url) {
      console.warn("Empty URL provided for deletion");
      return;
    }

    // Extract public ID from URL
    const parts = url.split('/');
    const publicIdWithExtension = parts.slice(parts.indexOf('upload') + 2).join('/');
    const publicId = publicIdWithExtension.split('.')[0];

    if (!publicId) {
      throw new Error(`Could not extract public ID from URL: ${url}`);
    }

    // Determine resource type based on file extension
    let resourceType = 'image';
    const extension = publicIdWithExtension.split('.').pop()?.toLowerCase();
    if (['mp4', 'mov', 'avi', 'mkv'].includes(extension)) {
      resourceType = 'video';
    }

    // Perform deletion
    const result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: resourceType,
      invalidate: true // Optional: invalidate CDN cache
    });

    if (result.result !== 'ok') {
      throw new Error(`Cloudinary deletion failed for ${url}: ${result.result}`);
    }

    console.log(`Successfully deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error(`Failed to delete media from Cloudinary: ${url}`, error);
    throw error; // Re-throw to allow handling in calling function
  }
};

// Separate function for chat media uploads
const uploadChatMedia = async (buffer, messageType) => {
  let folderName = messageType === "image" ? "chat_images" : messageType === "voice" ? "chat_voice" : "chat_media";
  return uploadToCloudinaryChat(buffer, folderName);
};


module.exports = { uploadToCloudinary, uploadMultipleToCloudinary, uploadChatMedia, uploadToCloudinaryChat, deleteFromCloudinary };
