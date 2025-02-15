const multer = require("multer");

// Store files in memory instead of disk
const storage = multer.memoryStorage();

const upload = multer({ storage });

const uploadMultiple = multer({ storage }).fields([
  { name: 'images', maxCount: 10 },  // Remove []
  { name: 'videos', maxCount: 5 }    
]);


module.exports = { upload, uploadMultiple };
