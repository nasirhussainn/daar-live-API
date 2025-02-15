const PropertySubtype = require("../../models/admin/PropertySubtype");
const PropertyType = require("../../models/admin/PropertyType");

// ✅ Create a new PropertySubtype
exports.createPropertySubtype = async (req, res) => {
    try {
        let { name, property_type, property_for, property_duration } = req.body;

        // Ensure PropertyType exists
        const propertyType = await PropertyType.findById(property_type);
        if (!propertyType) {
            return res.status(400).json({ error: "Invalid property_type ID" });
        }

        // Ensure property_for is valid for the given PropertyType
        if (!propertyType.property_for.includes(property_for)) {
            return res.status(400).json({ error: "property_for must match the PropertyType's property_for" });
        }

        // 🚨 Check if property_type supports both "sell" and "rent", then subtype must have only one.
        if (propertyType.property_for.includes("sell") && propertyType.property_for.includes("rent")) {
            if (property_for !== "sell" && property_for !== "rent") {
                return res.status(400).json({ error: "Subtype must be either 'sell' or 'rent', not both." });
            }
        }

        // Handle property_duration based on property_type's property_for
        if (propertyType.property_for.includes("sell") && propertyType.property_for.includes("rent")) {
            // property_duration is required only if 'rent' is chosen
            if (property_for === "rent" && !property_duration) {
                return res.status(400).json({ error: "property_duration is required when property_for is 'rent'" });
            } else if (property_for === "sell") {
                property_duration = null;
            }
        } else if (propertyType.property_for.includes("sell")) {
            property_duration = null; // Ensure duration is null for selling
        } else if (propertyType.property_for.includes("rent")) {
            // 🚨 If property_for is 'rent' and property_type allows multiple durations, subtype must have only one.
            if (Array.isArray(propertyType.allowed_durations)) {
                if (propertyType.allowed_durations.length > 1) {
                    if (!property_duration || !propertyType.allowed_durations.includes(property_duration)) {
                        return res.status(400).json({ error: "Invalid property_duration for this property type. Subtype must have only one." });
                    }
                }
            } else {
                property_duration = propertyType.allowed_durations; // Auto-assign if only one option exists
            }
        }

        // ✅ Check if a subtype with the same name and property_type already exists
        const existingSubtype = await PropertySubtype.findOne({ name, property_type });
        if (existingSubtype) {
            return res.status(400).json({ error: "A PropertySubtype with this name already exists for the given PropertyType." });
        }

        // Create new PropertySubtype
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
        const subtypes = await PropertySubtype.find({ is_active: true });
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
        if( subtype.is_active === false ) return res.status(404).json({ message: "PropertySubtype is inactive" });
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

        // Fetch the associated PropertyType
        const propertyType = await PropertyType.findById(subtype.property_type);
        if (!propertyType) {
            return res.status(400).json({ error: "Parent property type not found." });
        }

        // 🚨 Ensure PropertyType is active before activating the subtype
        if (!propertyType.is_active) {
            return res.status(400).json({ error: "Cannot reactivate subtype because its parent property type is inactive." });
        }

        // Reactivate the property subtype
        await PropertySubtype.updateOne({ _id: id }, { is_active: true });

        res.status(200).json({ message: "Property subtype reactivated successfully." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


