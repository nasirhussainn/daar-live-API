const Property = require("../../models/Properties");
const mailer = require("../../config/mailer"); // Import mailer functions
const sendNotification = require("../notification/sendNotification"); // Import the notification function
const User = require("../../models/User"); // Assuming you have a User model
const { translateText } = require("../../services/translateService");

exports.approveProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const property = await Property.findById(propertyId).populate("owner_id");

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    property.property_status = "approved";
    await property.save();

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    property.property_status = "approved";
    await property.save();

    // Send email notification
    if (property.owner_id && property.owner_id.email) {
      await mailer.sendPropertyStatusEmail(
        property.owner_id.email,
        property.title.get("en"),
        "approved",
      );
    }

    // Create in-app notification
    await sendNotification(
      property.owner_id._id,
      "Property",
      property._id,
      "Property Approved",
      `Your property "${property.title.get("en")}" has been approved and is now live.`,
    );

    res.json({ message: "Property approved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.disapproveProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const cancelation_reason = await translateText(req.body.cancelation_reason);
    const property = await Property.findById(propertyId).populate("owner_id");

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    property.property_status = "disapproved";

    property.cancelation_reason = cancelation_reason;
    await property.save();

    // Send email notification
    if (property.owner_id && property.owner_id.email) {
      await mailer.sendPropertyStatusEmail(
        property.owner_id.email,
        property.title,
        "disapproved",
        cancelation_reason.en,
      );
    }

    // Create in-app notification
    await sendNotification(
      property.owner_id._id,
      "property_disapproval",
      property._id,
      "Property Disapproved",
      `Unfortunately, your property "${property.title}" has been disapproved. Please contact support for more details.`,
    );

    res.json({ message: "Property disapproved successfully" });
  } catch (error) {
    console.error(error);
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
    res.json({
      message: "Property status changed to not available successfully",
    });
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
    res.json({
      message:
        "Property status changed to booking not allowed for booking successfully",
    });
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
    res.json({
      message:
        "Event status changed to booking not allowed for booking successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
