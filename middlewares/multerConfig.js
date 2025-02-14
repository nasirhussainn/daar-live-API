const multer = require("multer");

// Store files in memory instead of disk
const storage = multer.memoryStorage();

const upload = multer({ storage });

const uploadMultiple = multer({ storage }).fields([
    { name: 'images[]', maxCount: 10 },  // Multiple images
    { name: 'videos[]', maxCount: 5 }    // Multiple videos
  ]);

module.exports = { upload, uploadMultiple };
