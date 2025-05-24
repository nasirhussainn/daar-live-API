const express = require("express");
const { uploadMultiple } = require("../../middlewares/multerConfig");
const {
  addEvent,
  getAllEvents,
  getEventById,
  getAllEventsByHostId,
  deleteEvent,
  updateEvent,
  featureEvent,
  getFilteredEvents,
} = require("../../controller/events/eventController"); // Import event controller functions

const {
  findNearbyEvents,
} = require("../../controller/explore/exploreController");

const router = express.Router();

router.post("/add-event", uploadMultiple, addEvent);
router.get("/get-all", getAllEvents);
router.get("/get-via-id/:id", getEventById);
router.get("/get-by-host/:host_id", getAllEventsByHostId);
router.delete("/delete/:id", deleteEvent);
router.put("/update/:id", uploadMultiple, updateEvent);
router.put("/feature", featureEvent);
router.get("/explore", findNearbyEvents);
router.get("/filter", getFilteredEvents);

module.exports = router;
