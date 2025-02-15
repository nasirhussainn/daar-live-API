const EventType = require("../../models/admin/EventType");

// ✅ Create a new EventType
exports.createEventType = async (req, res) => {
    try {
        const { name } = req.body;

        // Check if event type with the same name already exists
        const existingEvent = await EventType.findOne({ name });
        if (existingEvent) {
            return res.status(400).json({ error: "Event type with this name already exists." });
        }

        const eventType = new EventType({ name, is_active: true });
        await eventType.save();
        res.status(201).json(eventType);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// ✅ Get all active EventTypes
exports.getAllEventTypes = async (req, res) => {
    try {
        const eventTypes = await EventType.find({ is_active: true });
        res.status(200).json(eventTypes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get a single EventType by ID
exports.getEventTypeById = async (req, res) => {
    try {
        const eventType = await EventType.findById(req.params.id);
        if (!eventType) {
            return res.status(404).json({ error: "Event type not found." });
        }
        if (!eventType.is_active) {
            return res.status(400).json({ error: "Event type is inactive." });
        }
        res.status(200).json(eventType);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Update EventType by ID
exports.updateEventType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // Check if event type exists
        const eventType = await EventType.findById(id);
        if (!eventType) {
            return res.status(404).json({ error: "Event type not found." });
        }

        // Check for duplicate names
        const existingEvent = await EventType.findOne({ name });
        if (existingEvent && existingEvent._id.toString() !== id) {
            return res.status(400).json({ error: "Event type with this name already exists." });
        }

        eventType.name = name;
        await eventType.save();
        res.status(200).json(eventType);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Delete EventType by ID
exports.deleteEventType = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if event type exists
        const eventType = await EventType.findById(id);
        if (!eventType) {
            return res.status(404).json({ error: "Event type not found." });
        }

        // Delete the event type
        await EventType.findByIdAndDelete(id);
        res.status(200).json({ message: "Event type deleted successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Deactivate EventType
exports.deactivateEventType = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if event type exists
        const eventType = await EventType.findById(id);
        if (!eventType) {
            return res.status(404).json({ error: "Event type not found." });
        }

        // Deactivate the event type
        eventType.is_active = false;
        await eventType.save();

        res.status(200).json({ message: "Event type deactivated successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Reactivate EventType
exports.reactivateEventType = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if event type exists
        const eventType = await EventType.findById(id);
        if (!eventType) {
            return res.status(404).json({ error: "Event type not found." });
        }

        // Reactivate the event type
        eventType.is_active = true;
        await eventType.save();

        res.status(200).json({ message: "Event type reactivated successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
