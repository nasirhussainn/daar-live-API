const express = require("express");
const {
  createPropertyType,
  getAllPropertyTypes,
  getPropertyTypeById,
  updatePropertyType,
  deletePropertyType,
  deactivatePropertyType,
  reactivatePropertyType,
} = require("../../controller/propertyFacilities/propertyTypeController");

const router = express.Router();

router.post("/property-types", createPropertyType);
router.get("/property-types", getAllPropertyTypes);
router.get("/property-types/:id", getPropertyTypeById);
router.put("/property-types/:id", updatePropertyType);
router.delete("/property-types/:id", deletePropertyType);
router.put("/property-types/deactivate/:id", deactivatePropertyType);
router.put("/property-types/reactivate/:id", reactivatePropertyType);

module.exports = router;
