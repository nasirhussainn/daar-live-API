const PropertyType = require("../../models/admin/PropertyType");
const PropertySubType = require("../../models/admin/PropertySubtype");
const { translateText } = require("../../services/translateService");

exports.createPropertyType = async (req, res) => {
  try {
    let { property_for, allowed_durations } = req.body;

    let name = await translateText(req.body.name);
    // Ensure property_for is either "rent" or "sell"
    if (!["rent", "sell"].includes(property_for)) {
      return res
        .status(400)
        .json({ error: "property_for must be 'rent' or 'sell'" });
    }

    // If property_for is "sell", allowed_durations should be null
    if (property_for === "sell") {
      allowed_durations = null;
    }

    // If property_for is "rent", allowed_durations must be provided and be a single string
    if (property_for === "rent") {
      if (!allowed_durations || typeof allowed_durations !== "string") {
        return res
          .status(400)
          .json({
            error:
              "allowed_durations must be a single string when property_for is 'rent'",
          });
      }
    }

    // Construct duplicate check condition
    let duplicateCondition = { name, property_for };
    if (property_for === "rent") {
      duplicateCondition.allowed_durations = allowed_durations;
    }

    // Check for duplicates only under the same property_for conditions
    const existingPropertyType = await PropertyType.findOne(duplicateCondition);

    if (existingPropertyType) {
      return res
        .status(400)
        .json({ error: "A PropertyType with the same details already exists" });
    }

    // Create new PropertyType
    const propertyType = new PropertyType({
      name,
      property_for,
      allowed_durations,
    });
    await propertyType.save();

    res.status(201).json(propertyType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ✅ Get all PropertyTypes with their PropertySubtypes
exports.getAllPropertyTypes = async (req, res) => {
  try {
    const propertyTypes = await PropertyType.find().lean();

    // Fetch and attach PropertySubtypes for each PropertyType
    const propertyTypesWithSubtypes = await Promise.all(
      propertyTypes.map(async (propertyType) => {
        const subtypes = await PropertySubType.find({
          property_type: propertyType._id,
        }).lean();
        return { ...propertyType, propertySubtypes: subtypes };
      }),
    );

    res.status(200).json(propertyTypesWithSubtypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get a single PropertyType by ID (including PropertySubtypes)
exports.getPropertyTypeById = async (req, res) => {
  try {
    const propertyType = await PropertyType.findById(req.params.id).lean();

    if (!propertyType)
      return res.status(404).json({ message: "PropertyType not found" });
    if (!propertyType.is_active)
      return res.status(404).json({ message: "PropertyType is inactive" });

    // Fetch related PropertySubtypes
    const propertySubtypes = await PropertySubType.find({
      property_type: propertyType._id,
      is_active: true,
    })
      .populate("property_type")
      .lean();

    res.status(200).json({ ...propertyType, propertySubtypes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePropertyType = async (req, res) => {
  try {
    const { id } = req.params;
    let { property_for, allowed_durations } = req.body;
    let name = await translateText(req.body.name);
    // Fetch the existing PropertyType
    const currentPropertyType = await PropertyType.findById(id);
    if (!currentPropertyType) {
      return res.status(404).json({ error: "PropertyType not found" });
    }

    // Validate property_for
    if (!["rent", "sell"].includes(property_for)) {
      return res
        .status(400)
        .json({ error: "property_for must be 'rent' or 'sell'" });
    }

    // If property_for is "sell", allowed_durations should be null
    if (property_for === "sell") {
      allowed_durations = null;
    }

    // If property_for is "rent", allowed_durations must be provided and should be a single string
    if (property_for === "rent") {
      if (!allowed_durations || typeof allowed_durations !== "string") {
        return res
          .status(400)
          .json({
            error:
              "allowed_durations must be a single string when property_for is 'rent'",
          });
      }
    }

    // Check if subtypes exist for this PropertyType
    const subtypes = await PropertySubType.find({ property_type: id });

    // Prevent incompatible updates if subtypes exist
    for (const subtype of subtypes) {
      if (property_for !== subtype.property_for) {
        return res.status(400).json({
          error: `Cannot change property_for to '${property_for}' because subtypes exist with '${subtype.property_for}'.`,
        });
      }
    }

    // Duplicate check logic
    let duplicateCondition = { name, property_for };
    if (property_for === "rent") {
      duplicateCondition.allowed_durations = allowed_durations;
    }

    const existingPropertyType = await PropertyType.findOne(duplicateCondition);
    if (existingPropertyType && existingPropertyType._id.toString() !== id) {
      return res
        .status(400)
        .json({ error: "A PropertyType with the same details already exists" });
    }

    // Update PropertyType
    const updatedPropertyType = await PropertyType.findByIdAndUpdate(
      id,
      { name, property_for, allowed_durations },
      { new: true },
    );

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
      return res
        .status(400)
        .json({ error: "Cannot delete property type. Subtypes exist." });
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
    const subtypesExist = await PropertySubType.exists({ property_type: id });
    if (subtypesExist) {
      await PropertySubType.updateMany(
        { property_type: id },
        { is_active: false },
      );
    }

    res.status(200).json({
      message: "Property type and related subtypes deactivated successfully.",
    });
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
    const subtypesExist = await PropertySubType.exists({ property_type: id });
    if (subtypesExist) {
      await PropertySubType.updateMany(
        { property_type: id },
        { is_active: true },
      );
    }

    res.status(200).json({
      message: "Property type and related subtypes reactivated successfully.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
