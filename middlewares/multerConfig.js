const multer = require("multer");

// Store files in memory instead of disk
const storage = multer.memoryStorage();

const upload = multer({ storage });

const uploadMultiple = multer({ storage }).fields([
  { name: "images", maxCount: 10 }, // Remove []
  { name: "videos", maxCount: 5 },
]);

const uploadSignup = multer({ storage }).fields([
  { name: "profile_picture", maxCount: 1 },
  { name: "verification_doc_image", maxCount: 1 },
  { name: "tax_id_image", maxCount: 1 },
]);

module.exports = { upload, uploadMultiple, uploadSignup };
