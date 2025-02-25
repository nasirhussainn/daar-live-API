const Amenity = require("../../models/admin/Amenities");

// ✅ Create a new Amenity
exports.createAmenity = async (req, res) => {
    try {
        const { name } = req.body;

        // Check if amenity with the same name already exists
        const existingAmenity = await Amenity.findOne({ name });
        if (existingAmenity) {
            return res.status(400).json({ error: "Amenity with this name already exists." });
        }

        const amenity = new Amenity({ name, is_active: true });
        await amenity.save();
        res.status(201).json(amenity);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// ✅ Get all active Amenities
exports.getAllAmenities = async (req, res) => {
    try {
        const amenities = await Amenity.find();
        res.status(200).json(amenities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get a single Amenity by ID
exports.getAmenityById = async (req, res) => {
    try {
        const amenity = await Amenity.findById(req.params.id);
        if (!amenity) {
            return res.status(404).json({ error: "Amenity not found." });
        }
        if (!amenity.is_active) {
            return res.status(400).json({ error: "Amenity is inactive." });
        }
        res.status(200).json(amenity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Update Amenity by ID
exports.updateAmenity = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // Check if amenity exists
        const amenity = await Amenity.findById(id);
        if (!amenity) {
            return res.status(404).json({ error: "Amenity not found." });
        }

        // Check for duplicate names
        const existingAmenity = await Amenity.findOne({ name });
        if (existingAmenity && existingAmenity._id.toString() !== id) {
            return res.status(400).json({ error: "Amenity with this name already exists." });
        }

        amenity.name = name;
        await amenity.save();
        res.status(200).json(amenity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Delete Amenity by ID
exports.deleteAmenity = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if amenity exists
        const amenity = await Amenity.findById(id);
        if (!amenity) {
            return res.status(404).json({ error: "Amenity not found." });
        }

        // Delete the amenity
        await Amenity.findByIdAndDelete(id);
        res.status(200).json({ message: "Amenity deleted successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Deactivate Amenity
exports.deactivateAmenity = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if amenity exists
        const amenity = await Amenity.findById(id);
        if (!amenity) {
            return res.status(404).json({ error: "Amenity not found." });
        }

        // Deactivate the amenity
        amenity.is_active = false;
        await amenity.save();

        res.status(200).json({ message: "Amenity deactivated successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Reactivate Amenity
exports.reactivateAmenity = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if amenity exists
        const amenity = await Amenity.findById(id);
        if (!amenity) {
            return res.status(404).json({ error: "Amenity not found." });
        }

        // Reactivate the amenity
        amenity.is_active = true;
        await amenity.save();

        res.status(200).json({ message: "Amenity reactivated successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
