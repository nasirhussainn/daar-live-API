const mongoose = require("mongoose");
const Event = require("../../models/Events");
const Location = require("../../models/Location");
const Media = require("../../models/Media");
const EventType = require("../../models/admin/EventType");
const { uploadMultipleToCloudinary } = require("../../config/cloudinary");

exports.addEvent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      host_id,
      title,
      description,
      event_type,
      start_date,
      end_date,
      start_time,
      end_time,
      entry_type,
      entry_price,
      location,
      no_of_days,
      payment_date,
      is_feature,
      allow_booking,
    } = req.body;

    // Validate event type
    const eventTypeExists = await EventType.findById(event_type);
    if (!eventTypeExists) {
      return res.status(400).json({ message: "Invalid event type" });
    }

    // Create and save location
    const locationData = new Location(location);
    const savedLocation = await locationData.save({ session });

    // Handle media upload
    let mediaUrls = { images: [], videos: [] };
    if (req.files) {
      const mediaFiles = [];

      if (req.files.images) {
        req.files.images.forEach((img) =>
          mediaFiles.push({ buffer: img.buffer, fieldname: "images" })
        );
      }

      if (req.files.videos) {
        req.files.videos.forEach((vid) =>
          mediaFiles.push({ buffer: vid.buffer, fieldname: "videos" })
        );
      }

      const folderName = "event_media_uploads";
      mediaUrls = await uploadMultipleToCloudinary(mediaFiles, folderName);
    }

    // Save media
    const mediaData = new Media({
      images: mediaUrls.images,
      videos: mediaUrls.videos,
    });
    const savedMedia = await mediaData.save({ session });

    // Create event
    const eventData = new Event({
      host_id,
      title,
      description,
      event_type,
      start_date,
      end_date,
      start_time,
      end_time,
      entry_type,
      entry_price,
      location: savedLocation._id,
      media: savedMedia._id,
      no_of_days,
      payment_date,
      is_feature,
      allow_booking,
    });

    const savedEvent = await eventData.save({ session });

    await session.commitTransaction();
    session.endSession();

    res
      .status(201)
      .json({
        message: "Event added successfully!",
        event: savedEvent,
        mediaUrls,
      });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res
      .status(500)
      .json({ message: "Error adding event", error: error.message });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("host_id")
      .populate("event_type")
      .populate("location")
      .populate("media");

    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching events", error: error.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id)
      .populate("host_id")
      .populate("event_type")
      .populate("location")
      .populate("media");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching event", error: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // Find event
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Delete associated location
    if (event.location) {
      await Location.findByIdAndDelete(event.location, { session });
    }

    // Delete associated media
    await Media.deleteMany({ _id: { $in: event.media } }, { session });

    // Delete the event
    await Event.findByIdAndDelete(id, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res
      .status(500)
      .json({ message: "Error deleting event", error: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const event = await Event.findByIdAndUpdate(id, updates, { new: true });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ message: "Event updated successfully", event });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error updating event", error: error.message });
  }
};
