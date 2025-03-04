const Property = require("../../models/Properties");

exports.approveProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    property.property_status = "approved";
    await property.save();
    res.json({ message: "Property approved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
