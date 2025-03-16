const mongoose = require("mongoose");
const Event = require("../../models/Events");
const Location = require("../../models/Location");
const Media = require("../../models/Media");
const EventType = require("../../models/admin/EventType");
const { uploadMultipleToCloudinary } = require("../../config/cloudinary");
const FeaturedEntity = require("../../models/FeaturedEntity");
const Review = require("../../models/Review");
const { getHostsStats } = require("../stats/getHostStats"); // Import the function
const {
  getReviewsWithCount,
  getReviewCount,
} = require("../../controller/reviews/getReviewsWithCount"); // Import the function
const { getAvgRating } = require("../user/getAvgRating"); // Import the function

const Admin = require("../../models/Admin"); // Import the Admin model
async function determineCreatedBy(owner_id) {
  if (!owner_id) return "realtor"; // If owner_id is not provided, assume it's a realtor
  const isAdmin = await Admin.exists({ _id: owner_id }); // Check if owner_id exists in Admin collection
  return isAdmin ? "Admin" : "User"; // Return "admin" if exists in Admin, otherwise "realtor"
}

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
      transaction_id,
      payment_date,
      transaction_price,
      is_feature,
      allow_booking,
    } = req.body;

    if (entry_type === "paid" && (!entry_price || entry_price == 0)) {
      return res.status(400).json({
        message: "Entry price cannot be zero or empty for paid events",
      });
    }

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
    const created_by = await determineCreatedBy(host_id);
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
    });

    const savedEvent = await eventData.save({ session });

    // Step 6: If the event is featured, create a FeaturedEntity record
    let featureEntity;
    let featureMessage = null;

    if (is_feature === "true" || is_feature === true) {
      try {
        featureEntity = new FeaturedEntity({
          transaction_id,
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
        savedEvent.is_featured = true; // Mark as featured
        await savedEvent.save({ session });
      } catch (featureError) {
        console.error("Error adding FeaturedEntity:", featureError.message);

        // Rollback is_featured to false since feature process failed
        savedEvent.is_featured = false;
        await savedEvent.save({ session });

        featureMessage =
          "Event was added successfully but could not be featured. You can request a feature again.";
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Return success response
    res.status(201).json({
      message:
        "Property added successfully!" +
        (featureMessage ? ` ${featureMessage}` : ""),
      event: savedEvent,
      mediaUrls: mediaUrls,
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

// ✅ Fetch all events with optional filters (featured, created_by) + Host Stats
exports.getAllEvents = async (req, res) => {
  try {
    let { page, limit, featured, created_by, status } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (featured === "true" || created_by) {
      query.$or = [];
      if (featured === "true") query.$or.push({ is_feature: true });
      if (created_by) query.$or.push({ created_by });
    }

    if(status) query.status = status;

    const totalEvents = await Event.countDocuments(query);

    const events = await Event.find(query)
      .populate({
        path: "host_id",
        select: "email full_name phone_number profile_picture", // Fetch only these fields
      })
      .populate("event_type")
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .skip(skip)
      .limit(limit);

    if (!events.length) {
      return res.status(404).json({ message: "No events found" });
    }

    // Get unique hosts
    const uniqueHosts = [
      ...new Set(events.map((event) => event.host_id._id.toString())),
    ];

    // Fetch statistics for each host
    const hostStats = {};
    const hostAvgRating = {};
    const hostReviewCount = {};
    for (const hostId of uniqueHosts) {
      hostStats[hostId] = await getHostsStats(hostId);
      hostAvgRating[hostId] = await getAvgRating(hostId);
      hostReviewCount[hostId] = await getReviewCount(hostId, "User");
    }

    // Fetch reviews and attach stats
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const reviews = await getReviewsWithCount(event._id, "Event");

        return {
          ...event.toObject(),
          reviews,
          host_stats: hostStats[event.host_id._id.toString()] || null,
          host_review_count:
            hostReviewCount[event.host_id._id.toString()] || null,
          host_avg_rating: hostAvgRating[event.host_id._id.toString()] || null,
        };
      })
    );

    res.status(200).json({
      totalEvents,
      currentPage: page,
      totalPages: Math.ceil(totalEvents / limit),
      events: eventsWithDetails,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching events", error: error.message });
  }
};

// ✅ Fetch single event by ID + Host Stats
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id)
      .populate({
        path: "host_id",
        select: "email full_name phone_number profile_picture", // Fetch only these fields
      })
      .populate("event_type")
      .populate("location")
      .populate("media")
      .populate("feature_details");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Fetch reviews for the event
    const reviews = await getReviewsWithCount(event._id, "Event");

    // Fetch host stats
    const hostId = event.host_id._id.toString();
    const hostStats = await getHostsStats(hostId);
    const hostReviewCount = await getReviewCount(hostId, "User");  // Fixed
    const hostAvgRating = await getAvgRating(hostId);  // Fixed

    res.status(200).json({
      ...event.toObject(),
      reviews,
      host_stats: hostStats || null,
      host_review_count: hostReviewCount || null, // Fixed variable name
      host_avg_rating: hostAvgRating || null, // Fixed variable name
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching event", error: error.message });
  }
};


// ✅ Fetch all events by host ID + Host Stats
exports.getAllEventsByHostId = async (req, res) => {
  try {
    const { host_id } = req.params;
    let { page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    const totalEvents = await Event.countDocuments({ host_id });

    const events = await Event.find({ host_id })
      .populate({
        path: "host_id",
        select: "email full_name phone_number profile_picture", // Fetch only these fields
      })
      .populate("event_type")
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .skip(skip)
      .limit(limit);

    if (!events.length) {
      return res.status(404).json({ message: "No events found for this host" });
    }

    // Fetch host stats
    const hostStats = await getHostsStats(host_id);
    const hostReviewCount = await getReviewCount(host_id, "User"); // Fetch review count
    const hostAvgRating = await getAvgRating(host_id); // Fetch average rating

    // Fetch reviews and attach stats
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const reviews = await getReviewsWithCount(event._id, "Event");

        return {
          ...event.toObject(),
          reviews,
          host_stats: hostStats || null,
          host_review_count: hostReviewCount || null, // Added review count
          host_avg_rating: hostAvgRating || null, // Added average rating
        };
      })
    );

    res.status(200).json({
      totalEvents,
      currentPage: page,
      totalPages: Math.ceil(totalEvents / limit),
      events: eventsWithDetails,
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

exports.featureEvent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      event_id,
      transaction_id,
      transaction_price,
      payment_date,
      no_of_days,
    } = req.body;

    // Validate required fields
    if (
      !event_id ||
      !transaction_id ||
      !transaction_price ||
      !payment_date ||
      !no_of_days
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Find property
    const event = await Event.findById(event_id).session(session);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Check if property is already featured
    if (event.feature_details) {
      return res.status(400).json({ message: "Event is already featured." });
    }

    // Create new FeaturedEntity
    const featureEntity = new FeaturedEntity({
      transaction_id,
      transaction_price,
      payment_date,
      no_of_days,
      is_active: true,
      property_id,
      entity_type: "event",
    });

    const savedFeatureEntity = await featureEntity.save({ session });

    // Update the Property with the FeaturedEntity reference
    event.feature_details = savedFeatureEntity._id;
    event.is_feature = true;
    await event.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Event has been successfully featured.",
      feature_details: savedFeatureEntity,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error(error);
    res
      .status(500)
      .json({ message: "Error featuring event", error: error.message });
  }
};
