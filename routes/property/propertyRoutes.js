// routes/propertyRoutes.js
const express = require("express");
const { uploadMultiple } = require("../../middlewares/multerConfig");
const {
  addProperty,
  getAllProperties,
  getPropertyById,
  getAllPropertiesByOwnerId,
  deleteProperty,
  featureProperty,
  updateProperty,
  getFilteredProperties,
  trackPropertyView,
  updateUnavailableSlots,
  clearUnavailableSlots,
} = require("../../controller/properties/propertyController"); // Import the controller function

// const { findNearbyProperties } = require('../../controller/explore/exploreController')
const {
  findNearbyProperties,
} = require("../../controller/explore/exploreController");
const router = express.Router();

// Add Property API
router.post("/add-property", uploadMultiple, addProperty); // Use the controller function
router.get("/get-all", getAllProperties);
router.get("/get-via-id/:id", getPropertyById);
router.get("/get-via-ownerId/:owner_id", getAllPropertiesByOwnerId);
router.delete("/delete/:id", deleteProperty);
router.put("/update/:propertyId", uploadMultiple, updateProperty);
router.put("/feature", featureProperty);
router.get("/explore", findNearbyProperties);
router.get("/filter", getFilteredProperties);
router.put("/view/:id", trackPropertyView);

router.put("/disable-slot/:property_id", updateUnavailableSlots);
router.delete("/clear-slot/:property_id", clearUnavailableSlots);

module.exports = router;
