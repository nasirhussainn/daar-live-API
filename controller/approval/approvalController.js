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

exports.disapproveProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    property.property_status = "disapproved";
    await property.save();
    res.json({ message: "Property disapproved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.soldPropertyStatus = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    property.property_status = "sold";
    property.is_available = false;
    await property.save();
    res.json({ message: "Property status changed to sold successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.notAvailablePropertyStatus = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    property.is_available = false;
    await property.save();
    res.json({ message: "Property status changed to not available successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.notForBookingProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    property.allow_booking = false;
    await property.save();
    res.json({ message: "Property status changed to booking not allowed for booking successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.notForBookingEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    event.allow_booking = false;
    await event.save();
    res.json({ message: "Event status changed to booking not allowed for booking successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};