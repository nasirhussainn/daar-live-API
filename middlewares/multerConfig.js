const multer = require("multer");

// Store files in memory instead of disk
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;
