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
        const propertyTypes = await PropertyType.find({ is_active: true });
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
        if( propertyType.is_active === false ) return res.status(404).json({ message: "PropertyType is inactive" });
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

        // Fetch current PropertyType
        const currentPropertyType = await PropertyType.findById(id);
        if (!currentPropertyType) {
            return res.status(404).json({ error: "PropertyType not found" });
        }

        const existingPropertyFor = currentPropertyType.property_for;

        // Ensure 'allowed_durations' is required if 'rent' is selected
        if (property_for.includes("rent") && (!allowed_durations || allowed_durations.length === 0)) {
            return res.status(400).json({ error: "allowed_durations is required when property_for includes 'rent'" });
        }

        // Check if subtypes exist for this PropertyType
        const subtypes = await PropertySubType.find({ property_type: id });

        // Prevent update if subtypes exist and new property_for is incompatible
        if (subtypes.length > 0) {
            if (existingPropertyFor.includes("rent") && !property_for.includes("rent")) {
                return res.status(400).json({ error: "Cannot remove 'rent' from property_for while subtypes exist." });
            }

            if (existingPropertyFor.includes("sell") && !property_for.includes("sell")) {
                return res.status(400).json({ error: "Cannot remove 'sell' from property_for while subtypes exist." });
            }
        }

        // If 'rent' is removed, set allowed_durations to null
        let updatedFields = { name, property_for };
        if (!property_for.includes("rent")) {
            updatedFields.allowed_durations = null;
        } else {
            updatedFields.allowed_durations = allowed_durations;
        }

        // Update property type
        const updatedPropertyType = await PropertyType.findByIdAndUpdate(id, updatedFields, { new: true });
        res.status(200).json(updatedPropertyType);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// ✅ Delete PropertyType by ID
exports.deletePropertyType = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the PropertyType exists
        const propertyType = await PropertyType.findById(id);
        if (!propertyType) {
            return res.status(404).json({ error: "Property type not found." });
        }

        // Check if any PropertySubType is linked to this PropertyType
        const subtypes = await PropertySubType.find({ property_type: id });
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

exports.deactivatePropertyType = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if PropertyType exists
        const propertyType = await PropertyType.findById(id);
        if (!propertyType) {
            return res.status(404).json({ error: "Property type not found." });
        }

        // Deactivate the property type
        propertyType.is_active = false;
        await propertyType.save();

        // Check if subtypes exist before deactivating
        const subtypesExist = await PropertySubtype.exists({ property_type: id });
        if (subtypesExist) {
            await PropertySubtype.updateMany({ property_type: id }, { is_active: false });
        }

        res.status(200).json({ message: "Property type and related subtypes deactivated successfully." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.reactivatePropertyType = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if PropertyType exists
        const propertyType = await PropertyType.findById(id);
        if (!propertyType) {
            return res.status(404).json({ error: "Property type not found." });
        }

        // Reactivate the property type
        propertyType.is_active = true;
        await propertyType.save();

        // Check if subtypes exist before reactivating
        const subtypesExist = await PropertySubtype.exists({ property_type: id });
        if (subtypesExist) {
            await PropertySubtype.updateMany({ property_type: id }, { is_active: true });
        }

        res.status(200).json({ message: "Property type and related subtypes reactivated successfully." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};




