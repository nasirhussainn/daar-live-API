const mongoose = require("mongoose");
const Event = require("../../models/Events");
const Location = require("../../models/Location");
const Media = require("../../models/Media");
const EventType = require("../../models/admin/EventType");
const { uploadMultipleToCloudinary } = require("../../config/cloudinary");
const FeaturedEntity = require("../../models/FeaturedEntity");
const Review = require("../../models/Review");
const PaymentHistory = require("../../models/PaymentHistory");
const Realtor = require("../../models/Realtor");
const User = require("../../models/User");
const AdminRevenue = require("../../models/admin/AdminRevenue"); // AdminRevenue model
const { updateAdminRevenue } = require("../../services/updateAdminRevenue"); // AdminRevenue service
const {
  translateText,
  translateToEnglish,
  simpleTranslateToEnglish,
} = require("../../services/translateService");

const { getHostsStats } = require("../stats/getHostStats"); // Import the function
const {
  getReviewsWithCount,
  getReviewCount,
} = require("../../controller/reviews/getReviewsWithCount"); // Import the function
const { getAvgRating } = require("../user/getAvgRating"); // Import the function

const {
  validateSubscriptionLimits,
} = require("../../services/subscriptionLimits");

const Admin = require("../../models/Admin"); // Import the Admin model
async function determineCreatedBy(owner_id) {
  const isAdmin = await Admin.exists({ _id: owner_id }); // Check if owner_id exists in Admin collection
  return isAdmin ? "Admin" : "User"; // Return "admin" if exists in Admin, otherwise "realtor"
}

exports.addEvent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Extract and translate necessary fields
    const {
      host_id,
      start_date,
      end_date,
      start_time,
      end_time,
      entry_type,
      entry_price,
      location,
      no_of_days,
      transaction_id,
      payment_date,
      transaction_price,
      is_feature,
      price_YER,
      currency,
    } = req.body;

    const title = await translateText(req.body.title);
    const description = await translateText(req.body.description);

    const country = req.body.country
      ? await translateText(req.body.country)
      : null;
    const state = req.body.state ? await translateText(req.body.state) : null;
    const city = req.body.city ? await translateText(req.body.city) : null;

    // Step 2: Validate subscription/trial limits
    // await validateSubscriptionLimits({
    //   userId: host_id,
    //   entityType: "event",
    //   session,
    // });

    // Step 3: Entry price validation
    if (entry_type === "paid" && (!entry_price || entry_price == 0)) {
      return res.status(400).json({
        message: "Entry price cannot be zero or empty for paid events",
      });
    }

    // Step 4: Validate event types
    const eventTypesArray = Array.isArray(req.body.event_type)
      ? req.body.event_type
      : JSON.parse(req.body.event_type || "[]");

    const validEventTypes = await EventType.find({
      _id: {
        $in: eventTypesArray.map((id) =>
          mongoose.Types.ObjectId.createFromHexString(id),
        ),
      },
    });

    if (validEventTypes.length !== eventTypesArray.length) {
      return res
        .status(400)
        .json({ message: "One or more event types are invalid" });
    }

    // Step 5: Translate and handle location and nearbyLocations
    const translatedLocationAddress = await translateText(
      location.location_address,
    );

    let nearbyLocationsArray = Array.isArray(location.nearbyLocations)
      ? location.nearbyLocations
      : JSON.parse(location.nearbyLocations || "[]");

    const translatedNearbyList = await Promise.all(
      nearbyLocationsArray.map((loc) => translateText(loc)),
    );

    const mergedNearbyLocations = {};
    for (const translation of translatedNearbyList) {
      for (const lang in translation) {
        if (!mergedNearbyLocations[lang]) {
          mergedNearbyLocations[lang] = [];
        }
        mergedNearbyLocations[lang].push(translation[lang]);
      }
    }

    const locationData = new Location({
      ...location,
      location_address: translatedLocationAddress,
      nearbyLocations: mergedNearbyLocations,
    });

    const savedLocation = await locationData.save({ session });

    // Step 6: Handle media uploads
    let mediaUrls = { images: [], videos: [] };

    if (req.files && (req.files.images || req.files.videos)) {
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

      const folderName = "event_media_daar_live";
      mediaUrls = await uploadMultipleToCloudinary(mediaFiles, folderName);
    }

    const mediaData = new Media({
      images: mediaUrls.images,
      videos: mediaUrls.videos,
    });
    const savedMedia = await mediaData.save({ session });

    // Step 7: Set default values
    let event_status = "pending";
    let allow_booking = true;

    const created_by = await determineCreatedBy(host_id);

    if (
      is_feature === "true" ||
      is_feature === true ||
      created_by === "Admin"
    ) {
      event_status = "approved";
    }

    // Step 8: Create the Event document
    const eventData = new Event({
      host_id,
      title,
      description,
      start_date,
      end_date,
      start_time,
      end_time,
      entry_type,
      entry_price,
      country,
      state,
      city,
      location: savedLocation ? savedLocation._id : null,
      media: savedMedia ? savedMedia._id : null,
      event_type: validEventTypes.map((e) => e._id),
      allow_booking,
      event_status,
      is_feature,
      created_by,
      currency,
      price_YER,
    });

    const savedEvent = await eventData.save({ session });

    // Step 9: If featured, create a FeaturedEntity
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
          entity_type: "event",
        });

        const savedFeaturedEntity = await featureEntity.save({ session });

        savedEvent.feature_details = savedFeaturedEntity._id;
        savedEvent.is_featured = true;
        await savedEvent.save({ session });
      } catch (featureError) {
        console.error("Error adding FeaturedEntity:", featureError.message);

        savedEvent.is_featured = false;
        await savedEvent.save({ session });

        featureMessage =
          "Event was added successfully but could not be featured. You can request a feature again.";
      }
    }

    // Step 10: Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message:
        "Event added successfully!" +
        (featureMessage ? ` ${featureMessage}` : ""),
      event: savedEvent,
      mediaUrls: mediaUrls,
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

    if (status) query.status = status;

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
      .limit(limit)
      .lean();

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
          ...event,
          reviews,
          host_stats: hostStats[event.host_id._id.toString()] || null,
          host_review_count:
            hostReviewCount[event.host_id._id.toString()] || null,
          host_avg_rating: hostAvgRating[event.host_id._id.toString()] || null,
        };
      }),
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
      .populate("feature_details")
      .lean();

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Fetch reviews for the event
    const reviews = await getReviewsWithCount(event._id, "Event");

    // Fetch host stats
    const hostId = event.host_id._id.toString();
    const hostStats = await getHostsStats(hostId);
    const hostReviewCount = await getReviewCount(hostId, "User"); // Fixed
    const hostAvgRating = await getAvgRating(hostId); // Fixed

    res.status(200).json({
      ...event,
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
      .limit(limit)
      .lean();

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
          ...event,
          reviews,
          host_stats: hostStats || null,
          host_review_count: hostReviewCount || null, // Added review count
          host_avg_rating: hostAvgRating || null, // Added average rating
        };
      }),
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: eventId } = req.params;
    const {
      host_id,
      start_date,
      end_date,
      start_time,
      end_time,
      entry_type,
      entry_price,
      location,
      no_of_days,
      transaction_id,
      payment_date,
      transaction_price,
      is_feature,
      allow_booking,
      price_YER,
      currency,
    } = req.body;

    // Step 1: Find existing event
    const existingEvent = await Event.findById(eventId).session(session);
    if (!existingEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Step 2: Translate and build updateData
    const updateData = {};

    if (req.body.title) updateData.title = await translateText(req.body.title);
    if (req.body.description)
      updateData.description = await translateText(req.body.description);
    if (req.body.city) updateData.city = await translateText(req.body.city);
    if (req.body.state) updateData.state = await translateText(req.body.state);
    if (req.body.country)
      updateData.country = await translateText(req.body.country);

    // Step 3: Validate entry price for paid events
    if (entry_type === "paid" && (!entry_price || Number(entry_price) <= 0)) {
      return res.status(400).json({
        message: "Entry price cannot be zero or empty for paid events",
      });
    }

    // Step 4: Assign direct values
    if (host_id) updateData.host_id = host_id;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (start_time) updateData.start_time = start_time;
    if (end_time) updateData.end_time = end_time;
    if (entry_type) updateData.entry_type = entry_type;
    if (entry_price) updateData.entry_price = entry_price;
    if (no_of_days) updateData.no_of_days = no_of_days;
    if (transaction_id) updateData.transaction_id = transaction_id;
    if (payment_date) updateData.payment_date = payment_date;
    if (transaction_price) updateData.transaction_price = transaction_price;
    if (typeof is_feature !== "undefined") updateData.is_feature = is_feature;
    if (typeof allow_booking !== "undefined")
      updateData.allow_booking = allow_booking;
    if (price_YER) updateData.price_YER = price_YER;
    if (currency) updateData.currency = currency;

    // Step 5: Validate event_type if provided
    if (req.body.event_type) {
      const eventTypeArray = Array.isArray(req.body.event_type)
        ? req.body.event_type
        : JSON.parse(req.body.event_type || "[]");

      const validEventTypes = await EventType.find({
        _id: {
          $in: eventTypeArray.map((id) =>
            mongoose.Types.ObjectId.createFromHexString(id),
          ),
        },
      });

      if (validEventTypes.length !== eventTypeArray.length) {
        return res
          .status(400)
          .json({ message: "One or more event types are invalid" });
      }

      updateData.event_type = validEventTypes.map((et) => et._id);
    }

    // Step 6: Handle location update
    if (location) {
      const nearbyLocationsArray = Array.isArray(location?.nearbyLocations)
        ? location.nearbyLocations
        : JSON.parse(location?.nearbyLocations || "[]");

      const translatedAddress = await translateText(location.location_address);
      const translatedNearbyLocations = await Promise.all(
        nearbyLocationsArray.map((loc) => translateText(loc)),
      );

      const mergedNearbyLocations = {};
      for (const translation of translatedNearbyLocations) {
        for (const lang in translation) {
          if (!mergedNearbyLocations[lang]) {
            mergedNearbyLocations[lang] = [];
          }
          mergedNearbyLocations[lang].push(translation[lang]);
        }
      }

      const locationUpdate = {
        ...location,
        location_address: translatedAddress,
        nearbyLocations: mergedNearbyLocations,
      };

      await Location.findByIdAndUpdate(existingEvent.location, locationUpdate, {
        session,
      });
    }

    // Step 7: Handle media updates
    let mediaUpdate = {};
    const folderName = "event_media_daar_live";
    let existingMedia = {};

    if (existingEvent.media) {
      existingMedia = await Media.findById(existingEvent.media).session(
        session,
      );
    }

    if (req.files) {
      const newMediaFiles = { images: [], videos: [] };

      if (req.files.images) {
        req.files.images.forEach((img) =>
          newMediaFiles.images.push({
            buffer: img.buffer,
            fieldname: "images",
          }),
        );
      }

      if (req.files.videos) {
        req.files.videos.forEach((vid) =>
          newMediaFiles.videos.push({
            buffer: vid.buffer,
            fieldname: "videos",
          }),
        );
      }

      if (newMediaFiles.images.length > 0) {
        const uploadedImages = await uploadMultipleToCloudinary(
          newMediaFiles.images,
          folderName,
        );
        if (existingMedia.images) {
          for (let image of existingMedia.images)
            await deleteFromCloudinary(image);
        }
        mediaUpdate.images = uploadedImages.images;
      } else {
        mediaUpdate.images = existingMedia.images || [];
      }

      if (newMediaFiles.videos.length > 0) {
        const uploadedVideos = await uploadMultipleToCloudinary(
          newMediaFiles.videos,
          folderName,
        );
        if (existingMedia.videos) {
          for (let video of existingMedia.videos)
            await deleteFromCloudinary(video);
        }
        mediaUpdate.videos = uploadedVideos.videos;
      } else {
        mediaUpdate.videos = existingMedia.videos || [];
      }

      if (Object.keys(mediaUpdate).length > 0) {
        await Media.findByIdAndUpdate(existingEvent.media, mediaUpdate, {
          session,
        });
      }
    }

    // Step 8: Final event update
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updateData },
      { new: true, session },
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Event updated successfully!",
      event: updatedEvent,
      media: mediaUpdate,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return res.status(500).json({
      message: "Error updating event",
      error: error.message,
    });
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

    // --------------Update Featured Listing Revenue-----------------
    const currentDate = new Date().toISOString().split("T")[0];
    await updateAdminRevenue(
      transaction_price,
      "featured_revenue",
      currentDate,
    );
    await updateAdminRevenue(transaction_price, "total_revenue", currentDate);
    // ------------------------------------------------------------

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // --------------log payment history-----------------
    const realtor = await Realtor.findById(event.host_id);
    const realtor_id = realtor._id;
    const paymentEntry = new PaymentHistory({
      payer_type: "Realtor",
      payer_id: realtor_id,
      recipient_type: "Admin",
      recipient_id: "67cf2566c17e98f39288671b", // Update this with your Admin ID
      transaction_id: transaction_id,
      amount: transaction_price,
      entity_type: "freatured_property",
      entity_id: subscription._id, // Link to the subscription
      status: "completed",
    });
    await paymentEntry.save(); // Save payment history
    // -------------------------------------------------

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

exports.getFilteredEvents = async (req, res) => {
  try {
    const {
      start_price,
      end_price,
      start_date,
      end_date,
      event_types,
      status,
      featured,
      country,
      city,
      state,
      min_rating,
      host_id,
      created_by,
      time_range,
      entry_type,
      //new search
      title,
      realtor,
    } = req.query;

    const filter = {
      status: { $in: ["upcoming", "live"] }, // Default
    };

    // Price Filter
    if (start_price !== undefined || end_price !== undefined) {
      filter.$expr = { $and: [] };

      if (start_price !== undefined) {
        filter.$expr.$and.push({
          $gte: [
            {
              $cond: {
                if: { $eq: [{ $type: "$entry_price" }, "string"] },
                then: { $toDouble: "$entry_price" },
                else: "$entry_price",
              },
            },
            Number(start_price),
          ],
        });
      }

      if (end_price !== undefined) {
        filter.$expr.$and.push({
          $lte: [
            {
              $cond: {
                if: { $eq: [{ $type: "$entry_price" }, "string"] },
                then: { $toDouble: "$entry_price" },
                else: "$entry_price",
              },
            },
            Number(end_price),
          ],
        });
      }

      if (filter.$expr.$and.length === 0) delete filter.$expr;
    }

    // Date Filter
    if (start_date) {
      filter.start_date = filter.start_date || {};
      filter.start_date.$gte = new Date(start_date);
    }
    if (end_date) {
      filter.end_date = filter.end_date || {};
      filter.end_date.$lte = new Date(end_date);
    }

    if (event_types) {
      filter.event_type = {
        $in: event_types
          .split(",")
          .map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (entry_type) filter.entry_type = entry_type;
    if (status) filter.status = status;
    if (featured) filter.is_feature = featured === "true";
    // Location filters
    if (city) {
      const englishCity = await simpleTranslateToEnglish(city);
      filter["city.en"] = { $regex: new RegExp(englishCity, "i") };
    }

    if (state) {
      const englishState = await simpleTranslateToEnglish(state);
      filter["state.en"] = { $regex: new RegExp(englishState, "i") };
    }

    if (country) {
      const translatedCountry = await translateToEnglish(country);
      console.log(translatedCountry);
      filter["country.en"] = {
        $regex: new RegExp(`^${translatedCountry}$`, "i"),
      };
    }
    if (min_rating) filter.avg_rating = { $gte: Number(min_rating) };
    if (host_id) filter.host_id = new mongoose.Types.ObjectId(host_id);
    if (created_by) filter.created_by = created_by;

    if (time_range) {
      const [startTime, endTime] = time_range.split("-");
      filter.start_time = { $gte: startTime };
      filter.end_time = { $lte: endTime };
    }

    if (title) {
      const translatedTitle = await simpleTranslateToEnglish(title);
      filter["title.en"] = { $regex: translatedTitle, $options: "i" };
    }

    if (realtor) {
      const translatedRealtor = await simpleTranslateToEnglish(realtor);
      const users = await User.find({
        full_name: { $regex: translatedRealtor, $options: "i" },
      }).select("_id");
      if (users.length > 0) {
        filter.host_id = { $in: users.map((user) => user._id) };
      } else {
        return res.status(200).json({
          totalEvents: 0,
          events: [],
        });
      }
    }

    const totalEvents = await Event.countDocuments(filter);

    const events = await Event.find(filter)
      .populate({
        path: "host_id",
        select: "email full_name phone_number profile_picture",
      })
      .populate("event_type")
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .sort({ start_date: 1 })
      .lean();

    if (!events.length) {
      return res.status(404).json({ message: "No events found" });
    }

    const uniqueHosts = [
      ...new Set(events.map((event) => event.host_id._id.toString())),
    ];

    const hostStats = {};
    const hostAvgRating = {};
    const hostReviewCount = {};
    for (const hostId of uniqueHosts) {
      hostStats[hostId] = await getHostsStats(hostId);
      hostAvgRating[hostId] = await getAvgRating(hostId);
      hostReviewCount[hostId] = await getReviewCount(hostId, "User");
    }

    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const reviews = await getReviewsWithCount(event._id, "Event");

        return {
          ...event,
          reviews,
          host_stats: hostStats[event.host_id._id.toString()] || null,
          host_review_count:
            hostReviewCount[event.host_id._id.toString()] || null,
          host_avg_rating: hostAvgRating[event.host_id._id.toString()] || null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      totalEvents,
      events: eventsWithDetails,
    });
  } catch (error) {
    console.error("Error filtering events:", error);
    res.status(500).json({
      success: false,
      message: "Error filtering events",
      error: error.message,
    });
  }
};
