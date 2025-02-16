const express = require('express');
const { uploadMultiple } = require("../../middlewares/multerConfig");
const { 
    addEvent, 
    getAllEvents, 
    getEventById, 
    deleteEvent,
    updateEvent
} = require('../../controller/events/eventController'); // Import event controller functions

const router = express.Router();

router.post('/add-event', uploadMultiple, addEvent); 
router.get('/get-all', getAllEvents);
router.get('/get-via-id/:id', getEventById);
router.delete('/delete/:id', deleteEvent);
router.put('/update/:id', uploadMultiple, updateEvent);

module.exports = router;
