const express = require("express");
const router = express.Router();
const propertySubtypeController = require("../../controller/propertyFacilities/propertySubtypeController");

router.post("/property-subtypes", propertySubtypeController.createPropertySubtype);
router.get("/property-subtypes", propertySubtypeController.getAllPropertySubtypes);
router.get("/property-subtypes/:id", propertySubtypeController.getPropertySubtypeById);
router.put("/property-subtypes/:id", propertySubtypeController.updatePropertySubtype);
router.delete("/property-subtypes/:id", propertySubtypeController.deletePropertySubtype);
router.put("/property-subtypes/deactivate/:id", propertySubtypeController.deactivatePropertySubtype);
router.put("/property-subtypes/reactivate/:id", propertySubtypeController.reactivatePropertySubtype);

module.exports = router;
