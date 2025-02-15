const express = require("express");
const router = express.Router();
const eventTypeController = require("../../controller/propertyFacilities/eventTypeController");

router.post("/event-type", eventTypeController.createEventType);
router.get("/event-type", eventTypeController.getAllEventTypes);
router.get("/event-type/:id", eventTypeController.getEventTypeById);
router.put("/event-type/:id", eventTypeController.updateEventType);
router.delete("/event-type/:id", eventTypeController.deleteEventType);
router.put("/event-type/deactivate/:id", eventTypeController.deactivateEventType);
router.put("/event-type/reactivate/:id", eventTypeController.reactivateEventType);

module.exports = router;
