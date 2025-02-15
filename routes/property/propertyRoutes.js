// routes/propertyRoutes.js
const express = require('express');
const { uploadMultiple } = require("../../middlewares/multerConfig");
const { addProperty, getAllProperties } = require('../../controller/properties/propertyController'); // Import the controller function
const router = express.Router();

// Add Property API
router.post('/add-property', uploadMultiple, addProperty); // Use the controller function
router.get('/get-all', getAllProperties)

module.exports = router;