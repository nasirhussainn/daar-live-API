const PropertyType = require("../../models/admin/PropertyType");
const PropertySubType = require("../../models/admin/PropertySubtype");

// ✅ Create a new PropertyType
exports.createPropertyType = async (req, res) => {
    try {
        const { name, property_for, allowed_durations } = req.body;

        // Ensure 'allowed_durations' is required if 'rent' is selected
        if (property_for.includes("rent") && (!allowed_durations || allowed_durations.length === 0)) {
            return res.status(400).json({ error: "allowed_durations is required when property_for includes 'rent'" });
        }

        const propertyType = new PropertyType({ name, property_for, allowed_durations });
        await propertyType.save();
        res.status(201).json(propertyType);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// ✅ Get all PropertyTypes
exports.getAllPropertyTypes = async (req, res) => {
    try {
        const propertyTypes = await PropertyType.find();
        res.status(200).json(propertyTypes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get a single PropertyType by ID
exports.getPropertyTypeById = async (req, res) => {
    try {
        const propertyType = await PropertyType.findById(req.params.id);
        if (!propertyType) return res.status(404).json({ message: "PropertyType not found" });
        res.status(200).json(propertyType);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Update PropertyType by ID
exports.updatePropertyType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, property_for, allowed_durations } = req.body;

        // Ensure 'allowed_durations' is required if 'rent' is selected
        if (property_for.includes("rent") && (!allowed_durations || allowed_durations.length === 0)) {
            return res.status(400).json({ error: "allowed_durations is required when property_for includes 'rent'" });
        }

        // Check if subtypes exist for this PropertyType
        const subtypes = await PropertySubType.find({ propertyType: id });

        // Prevent update if subtypes exist and new property_for is incompatible
        if (subtypes.length > 0) {
            const currentPropertyType = await PropertyType.findById(id);
            const existingPropertyFor = currentPropertyType.property_for;

            if (existingPropertyFor.includes("rent") && !property_for.includes("rent")) {
                return res.status(400).json({ error: "Cannot remove 'rent' from property_for while subtypes exist." });
            }

            if (existingPropertyFor.includes("sell") && !property_for.includes("sell")) {
                return res.status(400).json({ error: "Cannot remove 'sell' from property_for while subtypes exist." });
            }
        }

        // Update property type
        const updatedPropertyType = await PropertyType.findByIdAndUpdate(id, { name, property_for, allowed_durations }, { new: true });
        res.status(200).json(updatedPropertyType);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// ✅ Delete PropertyType by ID
exports.deletePropertyType = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if any PropertySubType is linked to this PropertyType
        const subtypes = await PropertySubType.find({ propertyType: id });

        if (subtypes.length > 0) {
            return res.status(400).json({ error: "Cannot delete property type. Subtypes exist." });
        }

        // Proceed with deletion
        await PropertyType.findByIdAndDelete(id);
        res.status(200).json({ message: "Property type deleted successfully." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
