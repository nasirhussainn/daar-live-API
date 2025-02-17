const mongoose = require("mongoose");
const Event = require("../../models/Events");
const Location = require("../../models/Location");
const Media = require("../../models/Media");
const EventType = require("../../models/admin/EventType");
const { uploadMultipleToCloudinary } = require("../../config/cloudinary");
const FeaturedEntity = require("../../models/FeaturedEntity");

exports.addEvent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      host_id,
      title,
      description,
      start_date,
      end_date,
      start_time,
      end_time,
      entry_type,
      entry_price,
      location,
      country,
      state,
      city,
      no_of_days,
      payment_date,
      transaction_price, // New field
      is_feature,
      allow_booking,
    } = req.body;

    const eventTypesArray = Array.isArray(req.body.event_type)
      ? req.body.event_type
      : JSON.parse(req.body.event_type || "[]");

    // Step 1: Validate event types
    const validEventTypes = await EventType.find({
      _id: {
        $in: eventTypesArray.map((id) =>
          mongoose.Types.ObjectId.createFromHexString(id)
        ),
      },
    });

    if (validEventTypes.length !== eventTypesArray.length) {
      return res
        .status(400)
        .json({ message: "One or more event types are invalid" });
    }

    // Step 2: Validate location and nearby locations
    const nearbyLocationsArray = Array.isArray(
      req.body.location?.nearbyLocations
    )
      ? req.body.location.nearbyLocations
      : JSON.parse(req.body.location?.nearbyLocations || "[]");
    const locationData = new Location({
      ...req.body.location,
      nearbyLocations: nearbyLocationsArray,
    });
    const savedLocation = await locationData.save({ session });

    // Step 3: Handle media uploads
    let mediaUrls = { images: [], videos: [] };
    let savedMedia = null;

    if (req.files) {
      const mediaFiles = [];

      if (req.files.images) {
        req.files.images.forEach((img) => {
          mediaFiles.push({ buffer: img.buffer, fieldname: "images" });
        });
      }

      if (req.files.videos) {
        req.files.videos.forEach((vid) => {
          mediaFiles.push({ buffer: vid.buffer, fieldname: "videos" });
        });
      }

      const folderName = "event_media_uploads";
      mediaUrls = await uploadMultipleToCloudinary(mediaFiles, folderName);

      // Save media if there are images or videos
      if (mediaUrls.images.length || mediaUrls.videos.length) {
        const mediaData = new Media({
          images: mediaUrls.images,
          videos: mediaUrls.videos,
        });
        savedMedia = await mediaData.save({ session });
      }
    }

    // Step 4: Set `created_by`, `allow_booking`, and `is_feature`
    let created_by = host_id ? "realtor" : "admin";
    let event_status = "pending";

    if (is_feature === "true" || is_feature === true) {
      event_status = "approved"; // Set status to approved if it's featured
    }

    // Step 5: Create the event data
    const eventData = new Event({
      host_id,
      title,
      description,
      event_type: validEventTypes.map((a) => a._id),
      start_date,
      end_date,
      start_time,
      end_time,
      entry_type,
      entry_price,
      location: savedLocation ? savedLocation._id : null,
      media: savedMedia ? savedMedia._id : null, // Only set if media exists
      country,
      state,
      city,
      no_of_days,
      payment_date,
      transaction_price,
      is_feature,
      allow_booking,
      created_by,
      event_status, // Store the event status
    });

    const savedEvent = await eventData.save({ session });

    // Step 6: If the event is featured, create a FeaturedEntity record
    let featureEntity;
    if (is_feature === "true" || is_feature === true) {
      featureEntity = new FeaturedEntity({
        transaction_price,
        payment_date,
        no_of_days,
        is_active: true,
        event_id: savedEvent._id,
        entity_type: "event", // Indicates this is an event
      });
      const savedFeaturedEntity = await featureEntity.save({ session });

      // Update the Event with the reference to the FeaturedEntity
      savedEvent.feature_details = savedFeaturedEntity._id;
      await savedEvent.save({ session });
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Return success response
    res.status(201).json({
      message: "Event added successfully!",
      event: savedEvent,
      mediaUrls,
    });
  } catch (error) {
    // If any error occurs, roll back the transaction
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
    let { page, limit } = req.query;

    page = parseInt(page) || 1; // Default page = 1
    limit = parseInt(limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit;

    // Fetch total event count for pagination
    const totalEvents = await Event.countDocuments();

    // Fetch paginated events
    const events = await Event.find()
      .populate("host_id")
      .populate("event_type")
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .skip(skip)
      .limit(limit);

    if (!events.length) {
      return res.status(404).json({ message: "No events found" });
    }

    res.status(200).json({
      totalEvents,
      currentPage: page,
      totalPages: Math.ceil(totalEvents / limit),
      events,
    });
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
      .populate("media")
      .populate("feature_details");

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

exports.getAllEventsByHostId = async (req, res) => {
  try {
    const { host_id } = req.params;
    let { page, limit } = req.query;

    page = parseInt(page) || 1; // Default page = 1
    limit = parseInt(limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit;

    // Fetch total event count for this host
    const totalEvents = await Event.countDocuments({ host_id });

    // Fetch paginated events for the given host_id
    const events = await Event.find({ host_id })
      .populate("host_id")
      .populate("event_type")
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .skip(skip)
      .limit(limit);

    if (!events.length) {
      return res.status(404).json({ message: "No events found for this host" });
    }

    res.status(200).json({
      totalEvents,
      currentPage: page,
      totalPages: Math.ceil(totalEvents / limit),
      events,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching events", error: error.message });
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
