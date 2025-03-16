const multer = require("multer");

// Store files in memory instead of disk
const storage = multer.memoryStorage();

const upload = multer({ storage });

const uploadMultiple = multer({ storage }).fields([
  { name: 'images', maxCount: 10 },  // Remove []
  { name: 'videos', maxCount: 5 }    
]);

const uploadSignup = multer({ storage }).fields([
  { name: "profile_picture", maxCount: 1 },  
  { name: "document_list", maxCount: 10 }, // Allow up to 10 documents
]);


module.exports = { upload, uploadMultiple, uploadSignup };
