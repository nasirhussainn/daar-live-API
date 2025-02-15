const PropertySubtype = require("../../models/admin/PropertySubtype");
const PropertyType = require("../../models/admin/PropertyType");

// ✅ Create a new PropertySubtype
exports.createPropertySubtype = async (req, res) => {
    try {
        const { name, property_type, property_for, property_duration } = req.body;

        // Ensure PropertyType exists
        const propertyType = await PropertyType.findById(property_type);
        if (!propertyType) {
            return res.status(400).json({ error: "Invalid property_type ID" });
        }

        // Ensure property_for matches PropertyType's property_for
        if (!propertyType.property_for.includes(property_for)) {
            return res.status(400).json({ error: "property_for must match the PropertyType's property_for" });
        }

        // Ensure property_duration is required if 'rent' is selected
        if (property_for === "rent" && !property_duration) {
            return res.status(400).json({ error: "property_duration is required when property_for is 'rent'" });
        }

        const propertySubtype = new PropertySubtype({ name, property_type, property_for, property_duration });
        await propertySubtype.save();
        res.status(201).json(propertySubtype);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get all PropertySubtypes
exports.getAllPropertySubtypes = async (req, res) => {
    try {
        const subtypes = await PropertySubtype.find().populate("property_type", "name property_for");
        res.status(200).json(subtypes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get a single PropertySubtype by ID
exports.getPropertySubtypeById = async (req, res) => {
    try {
        const subtype = await PropertySubtype.findById(req.params.id).populate("property_type", "name property_for");
        if (!subtype) return res.status(404).json({ message: "PropertySubtype not found" });
        res.status(200).json(subtype);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Update PropertySubtype by ID
exports.updatePropertySubtype = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, property_type, property_for, property_duration } = req.body;

        // Ensure PropertySubtype exists
        const existingSubtype = await PropertySubtype.findById(id);
        if (!existingSubtype) {
            return res.status(404).json({ error: "PropertySubtype not found" });
        }

        // Ensure PropertyType exists
        if (property_type) {
            const propertyType = await PropertyType.findById(property_type);
            if (!propertyType) {
                return res.status(400).json({ error: "Invalid property_type ID" });
            }

            // Ensure property_for matches PropertyType's property_for
            if (!propertyType.property_for.includes(property_for)) {
                return res.status(400).json({ error: "property_for must match the PropertyType's property_for" });
            }
        }

        // Ensure property_duration is required if 'rent' is selected
        if (property_for === "rent" && !property_duration) {
            return res.status(400).json({ error: "property_duration is required when property_for is 'rent'" });
        }

        const updatedSubtype = await PropertySubtype.findByIdAndUpdate(
            id,
            { name, property_type, property_for, property_duration },
            { new: true }
        );

        res.status(200).json(updatedSubtype);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Delete PropertySubtype by ID
exports.deletePropertySubtype = async (req, res) => {
    try {
        const { id } = req.params;

        const subtype = await PropertySubtype.findById(id);
        if (!subtype) return res.status(404).json({ message: "PropertySubtype not found" });

        await PropertySubtype.findByIdAndDelete(id);
        res.status(200).json({ message: "PropertySubtype deleted successfully." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deactivatePropertySubtype = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if PropertySubtype exists and is active
        const subtype = await PropertySubtype.findById(id);
        if (!subtype) {
            return res.status(404).json({ error: "Property subtype not found." });
        }
        if (!subtype.is_active) {
            return res.status(400).json({ error: "Property subtype is already deactivated." });
        }

        // Deactivate the property subtype
        await PropertySubtype.updateOne({ _id: id }, { is_active: false });

        res.status(200).json({ message: "Property subtype deactivated successfully." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.reactivatePropertySubtype = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if PropertySubtype exists and is inactive
        const subtype = await PropertySubtype.findById(id);
        if (!subtype) {
            return res.status(404).json({ error: "Property subtype not found." });
        }
        if (subtype.is_active) {
            return res.status(400).json({ error: "Property subtype is already active." });
        }

        // Reactivate the property subtype
        await PropertySubtype.updateOne({ _id: id }, { is_active: true });

        res.status(200).json({ message: "Property subtype reactivated successfully." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

