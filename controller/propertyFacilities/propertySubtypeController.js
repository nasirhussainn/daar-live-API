const PropertySubtype = require("../../models/admin/PropertySubtype");
const PropertyType = require("../../models/admin/PropertyType");
const { translateText } = require("../../services/translateService");

// ✅ Create a new PropertySubtype
exports.createPropertySubtype = async (req, res) => {
  try {
    let { property_type, property_for, property_duration } = req.body;
    let name = await translateText(req.body.name);

    // Ensure PropertyType exists
    const propertyType = await PropertyType.findById(property_type);
    if (!propertyType) {
      return res.status(400).json({ error: "Invalid property_type ID" });
    }

    // Ensure property_for matches the parent PropertyType
    if (propertyType.property_for[0] !== property_for) {
      return res
        .status(400)
        .json({
          error: "property_for must match the PropertyType's property_for",
        });
    }

    // Handle property_duration validation based on PropertyType
    if (propertyType.property_for[0] === "sell") {
      property_duration = null; // Ensure duration is null for selling
    } else if (propertyType.property_for[0] === "rent") {
      // Ensure property_duration is set and matches allowed durations
      if (!property_duration) {
        return res
          .status(400)
          .json({
            error: "property_duration is required when property_for is 'rent'",
          });
      }
      if (propertyType.allowed_durations[0] !== property_duration) {
        return res
          .status(400)
          .json({
            error:
              "Invalid property_duration. It must match the parent PropertyType's allowed_durations",
          });
      }
    }

    // ✅ Check if a subtype with the same name and property_type already exists
    const existingSubtype = await PropertySubtype.findOne({
      name,
      property_type,
    });
    if (existingSubtype) {
      return res
        .status(400)
        .json({
          error:
            "A PropertySubtype with this name already exists for the given PropertyType.",
        });
    }

    // Create new PropertySubtype
    const propertySubtype = new PropertySubtype({
      name,
      property_type,
      property_for,
      property_duration,
    });
    await propertySubtype.save();

    res.status(201).json(propertySubtype);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get all PropertySubtypes
exports.getAllPropertySubtypes = async (req, res) => {
  try {
    const subtypes = await PropertySubtype.find();
    res.status(200).json(subtypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get a single PropertySubtype by ID
exports.getPropertySubtypeById = async (req, res) => {
  try {
    const subtype = await PropertySubtype.findById(req.params.id).populate(
      "property_type",
      "name property_for",
    );
    if (!subtype)
      return res.status(404).json({ message: "PropertySubtype not found" });
    if (subtype.is_active === false)
      return res.status(404).json({ message: "PropertySubtype is inactive" });
    res.status(200).json(subtype);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update PropertySubtype by ID
exports.updatePropertySubtype = async (req, res) => {
  try {
    const { id } = req.params;
    let { property_type, property_for, property_duration } = req.body;
    let name = await translateText(req.body.name);

    // Ensure PropertySubtype exists
    const existingSubtype = await PropertySubtype.findById(id);
    if (!existingSubtype) {
      return res.status(404).json({ error: "PropertySubtype not found" });
    }

    // Ensure PropertyType exists if updating property_type
    if (property_type) {
      const propertyType = await PropertyType.findById(property_type);
      if (!propertyType) {
        return res.status(400).json({ error: "Invalid property_type ID" });
      }

      // Ensure property_for matches the parent PropertyType
      if (propertyType.property_for[0] !== property_for) {
        return res
          .status(400)
          .json({
            error: "property_for must match the PropertyType's property_for",
          });
      }

      // Handle property_duration validation based on PropertyType
      if (propertyType.property_for[0] === "sell") {
        property_duration = null; // Ensure duration is null for selling
      } else if (propertyType.property_for[0] === "rent") {
        // Ensure property_duration is set and matches allowed durations
        if (!property_duration) {
          return res
            .status(400)
            .json({
              error:
                "property_duration is required when property_for is 'rent'",
            });
        }
        if (propertyType.allowed_durations[0] !== property_duration) {
          return res
            .status(400)
            .json({
              error:
                "Invalid property_duration. It must match the parent PropertyType's allowed_durations",
            });
        }
      }
    }

    // ✅ Check if a subtype with the same name and property_type already exists (excluding the current one)
    if (name && property_type) {
      const existingSubtypeWithName = await PropertySubtype.findOne({
        name,
        property_type,
        _id: { $ne: id },
      });
      if (existingSubtypeWithName) {
        return res
          .status(400)
          .json({
            error:
              "A PropertySubtype with this name already exists for the given PropertyType.",
          });
      }
    }

    // Update PropertySubtype
    const updatedSubtype = await PropertySubtype.findByIdAndUpdate(
      id,
      { name, property_type, property_for, property_duration },
      { new: true },
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
    if (!subtype)
      return res.status(404).json({ message: "PropertySubtype not found" });

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
      return res
        .status(400)
        .json({ error: "Property subtype is already deactivated." });
    }

    // Deactivate the property subtype
    await PropertySubtype.updateOne({ _id: id }, { is_active: false });

    res
      .status(200)
      .json({ message: "Property subtype deactivated successfully." });
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
      return res
        .status(400)
        .json({ error: "Property subtype is already active." });
    }

    // Fetch the associated PropertyType
    const propertyType = await PropertyType.findById(subtype.property_type);
    if (!propertyType) {
      return res.status(400).json({ error: "Parent property type not found." });
    }

    // 🚨 Ensure PropertyType is active before activating the subtype
    if (!propertyType.is_active) {
      return res
        .status(400)
        .json({
          error:
            "Cannot reactivate subtype because its parent property type is inactive.",
        });
    }

    // Reactivate the property subtype
    await PropertySubtype.updateOne({ _id: id }, { is_active: true });

    res
      .status(200)
      .json({ message: "Property subtype reactivated successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
