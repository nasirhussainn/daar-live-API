// routes/propertyRoutes.js
const express = require('express');
const { uploadMultiple } = require("../../middlewares/multerConfig");
const { addProperty, getAllProperties, getPropertyById, getAllPropertiesByOwnerId,  deleteProperty, featureProperty, updateProperty } = require('../../controller/properties/propertyController'); // Import the controller function
const router = express.Router();

// Add Property API
router.post('/add-property', uploadMultiple, addProperty); // Use the controller function
router.get('/get-all', getAllProperties)
router.get('/get-via-id/:id', getPropertyById)
router.get('/get-via-ownerId/:owner_id', getAllPropertiesByOwnerId)
router.delete('/delete/:id', deleteProperty)
router.put('/update/:propertyId', updateProperty)
router.put('/feature', featureProperty)

module.exports = router;