const express = require("express");
const router = express.Router();
const amenityController = require("../../controller/propertyFacilities/amenitiesController");

router.post("/amenity", amenityController.createAmenity);
router.get("/amenity", amenityController.getAllAmenities);
router.get("/amenity/:id", amenityController.getAmenityById);
router.put("/amenity/:id", amenityController.updateAmenity);
router.delete("/amenity/:id", amenityController.deleteAmenity);
router.put("/amenity/deactivate/:id", amenityController.deactivateAmenity);
router.put("/amenity/reactivate/:id", amenityController.reactivateAmenity);

module.exports = router;
