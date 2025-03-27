const mongoose = require("mongoose");
const Property = require("../../models/Properties");
const Location = require("../../models/Location");
const Media = require("../../models/Media");
const Amenities = require("../../models/admin/Amenities");
const PropertySubtype = require("../../models/admin/PropertySubtype");
const FeaturedEntity = require("../../models/FeaturedEntity");
const SavedProperty = require("../../models/SavedProperty");
const Realtor = require("../../models/Realtor");
const Review = require("../../models/Review");
const Booking = require("../../models/Booking");
const PaymentHistory = require("../../models/PaymentHistory");
const AdminRevenue = require("../../models/admin/AdminRevenue"); // AdminRevenue model
const { updateAdminRevenue } = require("../../services/updateAdminRevenue"); // AdminRevenue service

const {
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
} = require("../../config/cloudinary"); // Import cloudinary helper
const { getRealtorStats } = require("../../controller/stats/getRealtorStats"); // Import the function
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

exports.addProperty = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Extract data from the request body
    const {
      owner_id,
      title,
      description,
      property_purpose,
      property_duration,
      property_type,
      property_subtype,
      price,
      country,
      state,
      city,
      location,
      area_size,
      bedrooms,
      bathrooms,
      charge_per,
      security_deposit,
      no_of_days,
      transaction_id,
      payment_date,
      transaction_price,
      is_feature,
    } = req.body;

    // Validate subscription/trial limits (throws error if limit reached)
    await validateSubscriptionLimits({
      userId: owner_id,
      entityType: "property",
      session,
    });

    // Step 2: Validate property_subtype against property_purpose
    const subType = await PropertySubtype.findById(property_subtype);
    if (!subType) {
      return res.status(400).json({ message: "Invalid property subtype" });
    }

    if (subType.property_for !== property_purpose) {
      return res.status(400).json({
        message: `Selected property subtype does not match property_purpose: ${property_purpose}`,
      });
    }

    // Step 3: Validate amenities (ensure all provided amenity IDs exist)
    const amenitiesArray = Array.isArray(req.body.amenities)
      ? req.body.amenities
      : JSON.parse(req.body.amenities || "[]");

    const validAmenities = await Amenities.find({
      _id: {
        $in: amenitiesArray.map((id) =>
          mongoose.Types.ObjectId.createFromHexString(id)
        ),
      },
    });

    if (validAmenities.length !== amenitiesArray.length) {
      return res
        .status(400)
        .json({ message: "One or more amenities are invalid" });
    }

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

    // Step 4: Handle Media uploadMultiple for the Property
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

      const folderName = "property_media_daar_live";
      mediaUrls = await uploadMultipleToCloudinary(mediaFiles, folderName);
    }

    // Step 5: Create a new Media record
    const mediaData = new Media({
      images: mediaUrls.images,
      videos: mediaUrls.videos,
    });
    const savedMedia = await mediaData.save({ session });

    // Step 6: Set `property_status`, `allow_booking`, and `created_by`
    let property_status = "pending";
    let allow_booking = true;

    const created_by = await determineCreatedBy(owner_id);

    if (property_purpose === "sell") {
      allow_booking = false; // If purpose is "sell", disable booking
    }

    if (
      is_feature === "true" ||
      is_feature === true ||
      created_by === "Admin"
    ) {
      property_status = "approved"; // If featured, set status to approved
    }

    // Step 7: Create a new Property
    const propertyData = new Property({
      owner_id,
      title,
      description,
      property_purpose,
      property_duration,
      property_type,
      property_subtype,
      price,
      country,
      state,
      city,
      location: savedLocation ? savedLocation._id : null,
      media: savedMedia ? savedMedia._id : null, // Only set if media exists
      area_size,
      bedrooms,
      bathrooms,
      amenities: validAmenities.map((a) => a._id),
      charge_per,
      security_deposit,
      no_of_days,
      payment_date,
      transaction_price,
      is_feature,
      allow_booking,
      property_status,
      created_by,
    });

    const savedProperty = await propertyData.save({ session });

    // Step 8: If the property is featured, try creating a FeaturedEntity
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
          property_id: savedProperty._id,
          entity_type: "property", // This indicates it's a property
        });

        const savedFeaturedEntity = await featureEntity.save({ session });

        // Update the Property with the reference to the FeaturedEntity
        savedProperty.feature_details = savedFeaturedEntity._id;
        savedProperty.is_featured = true; // Mark as featured
        await savedProperty.save({ session });
      } catch (featureError) {
        console.error("Error adding FeaturedEntity:", featureError.message);

        // Rollback is_featured to false since feature process failed
        savedProperty.is_featured = false;
        await savedProperty.save({ session });

        featureMessage =
          "Property was added successfully but could not be featured. You can request a feature again.";
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Step 9: Return success response
    res.status(201).json({
      message:
        "Property added successfully!" +
        (featureMessage ? ` ${featureMessage}` : ""),
      property: savedProperty,
      mediaUrls: mediaUrls, // Return the media URLs in response
    });
  } catch (error) {
    // If any error occurs, roll back the transaction
    await session.abortTransaction();
    session.endSession();

    console.error(error);
    res
      .status(500)
      .json({ message: "Error adding property", error: error.message });
  }
};

exports.getAllProperties = async (req, res) => {
  try {
    let { page, limit, featured, user_id, created_by, property_status } =
      req.query;
    page = parseInt(page) || 1; // Default page = 1
    limit = parseInt(limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit;

    // Build query object
    const query = {};
    if (featured === "true" || created_by) {
      query.$or = [];
      if (featured === "true") query.$or.push({ is_feature: true });
      if (created_by) query.$or.push({ created_by });
    }

    if (property_status) query.property_status = property_status;

    // Fetch total count for pagination
    const totalProperties = await Property.countDocuments(query);

    // Fetch properties with pagination & filter
    const properties = await Property.find(query)
      .populate({
        path: "owner_id",
        select: "email full_name phone_number profile_picture", // Only these fields will be included
      })
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .populate("property_type")
      .populate("property_subtype")
      .skip(skip)
      .limit(limit);

    // Fetch amenities, reviews, saved status, and realtor stats
    const propertiesWithDetails = await Promise.all(
      properties.map(async (property) => {
        const amenitiesDetails = await Amenities.find({
          _id: { $in: property.amenities },
        });

        const reviewData = await getReviewsWithCount(property._id, "Property");

        let savedStatus = "unlike"; // Default status

        // If user_id is provided, check saved status
        if (user_id) {
          const savedProperty = await SavedProperty.findOne({
            user_id,
            property_id: property._id,
          });

          if (savedProperty) {
            savedStatus = savedProperty.status; // 'like' or 'unlike'
          }
        }

        // Fetch realtor stats if owner_id exists
        let realtorStats = null;
        if (property.owner_id) {
          realtorStats = await getRealtorStats(property.owner_id._id); // Reusing function
          realtorAvgRating = await getAvgRating(property.owner_id._id);
          reatorReviewCount = await getReviewCount(
            property.owner_id._id,
            "User"
          );
        }

        return {
          ...property.toObject(),
          amenities: amenitiesDetails, // Replace IDs with actual amenities details
          review: reviewData,
          saved_status: savedStatus, // Include saved property status
          realtor_stats: realtorStats, // ✅ Now includes realtor statistics
          realtor_review_count: reatorReviewCount,
          realtor_avg_rating: realtorAvgRating,
        };
      })
    );

    res.status(200).json({
      totalProperties,
      currentPage: page,
      totalPages: Math.ceil(totalProperties / limit),
      properties: propertiesWithDetails,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching properties", error: error.message });
  }
};

exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query; // Extract user_id from query params

    const property = await Property.findById(id)
      .populate({
        path: "owner_id",
        select: "email full_name phone_number profile_picture", // Only these fields will be included
      })
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .populate("property_type")
      .populate("property_subtype");

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Fetch amenities details
    const amenitiesDetails = await Amenities.find({
      _id: { $in: property.amenities },
    });

    // Fetch property reviews
    const reviewData = await getReviewsWithCount(property._id, "Property");

    // Default status as 'unlike'
    let saved_status = "unlike";

    // If user_id is provided, check if the user has liked the property
    if (user_id) {
      const savedProperty = await SavedProperty.findOne({
        user_id,
        property_id: id,
      });

      if (savedProperty && savedProperty.status === "like") {
        saved_status = "like";
      }
    }

    // Fetch realtor statistics if owner_id exists
    let realtorStats = null;
    if (property.owner_id) {
      realtorStats = await getRealtorStats(property.owner_id._id);
      realtorAvgRating = await getAvgRating(property.owner_id._id);
      reatorReviewCount = await getReviewCount(property.owner_id._id, "User");
    }

    res.status(200).json({
      ...property.toObject(),
      amenities: amenitiesDetails,
      reviews: reviewData,
      saved_status, // Include saved status
      realtor_stats: realtorStats, // Only include stats if successful
      realtor_review_count: reatorReviewCount,
      realtor_avg_rating: realtorAvgRating,
    });
  } catch (error) {
    console.error("Error fetching property details:", error);
    res
      .status(500)
      .json({ message: "Error fetching property", error: error.message });
  }
};

exports.getAllPropertiesByOwnerId = async (req, res) => {
  try {
    const { owner_id } = req.params;
    let { page, limit } = req.query;

    page = parseInt(page) || 1; // Default page = 1
    limit = parseInt(limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit;

    // Fetch total property count for pagination
    const totalProperties = await Property.countDocuments({ owner_id });

    // Fetch paginated properties that belong to the given owner_id
    const properties = await Property.find({ owner_id })
      .populate({
        path: "owner_id",
        select: "email full_name phone_number profile_picture", // Only these fields will be included
      })
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .populate("property_type")
      .populate("property_subtype")
      .skip(skip)
      .limit(limit);

    if (!properties.length) {
      return res
        .status(404)
        .json({ message: "No properties found for this owner" });
    }

    // Fetch realtor statistics
    let realtorStats = await getRealtorStats(owner_id);
    let realtorAvgRating = await getAvgRating(owner_id);
    let reatorReviewCount = await getReviewCount(owner_id, "User");

    // Fetch amenities and reviews for each property
    const propertiesWithDetails = await Promise.all(
      properties.map(async (property) => {
        const amenitiesDetails = await Amenities.find({
          _id: { $in: property.amenities },
        });

        const reviewData = await getReviewsWithCount(property._id, "Property");

        return {
          ...property.toObject(),
          amenities: amenitiesDetails, // Replace IDs with actual amenities details
          reviews: reviewData, // Include review details
          realtor_stats: realtorStats,
          realtor_review_count: reatorReviewCount,
          realtor_avg_rating: realtorAvgRating,
        };
      })
    );

    res.status(200).json({
      totalProperties,
      currentPage: page,
      totalPages: Math.ceil(totalProperties / limit),
      properties: propertiesWithDetails,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching properties", error: error.message });
  }
};

exports.deleteProperty = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // Step 1: Find the property by ID
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Step 2: Delete associated Location (if exists)
    if (property.location) {
      await Location.findByIdAndDelete(property.location, { session });
    }

    // Step 3: Delete associated Media (if exists)
    await Media.deleteMany(
      { entity: property._id, entity_type: "property" },
      { session }
    );

    // Step 4: Delete the property itself
    await Property.findByIdAndDelete(id, { session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Property deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error(error);
    res
      .status(500)
      .json({ message: "Error deleting property", error: error.message });
  }
};

exports.featureProperty = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      property_id,
      transaction_id,
      transaction_price,
      payment_date,
      no_of_days,
    } = req.body;

    // Validate required fields
    if (
      !property_id ||
      !transaction_id ||
      !transaction_price ||
      !payment_date ||
      !no_of_days
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Find property
    const property = await Property.findById(property_id).session(session);
    if (!property) {
      return res.status(404).json({ message: "Property not found." });
    }

    // Check if property is already featured
    if (property.feature_details) {
      return res.status(400).json({ message: "Property is already featured." });
    }

    // Create new FeaturedEntity
    const featureEntity = new FeaturedEntity({
      transaction_id,
      transaction_price,
      payment_date,
      no_of_days,
      is_active: true,
      property_id,
      entity_type: "property",
    });

    if (property.allow_booking === false) {
      property.allow_booking = true;
    }
    if (property.is_available === false) {
      property.is_available = true;
    }

    await property.save();
    const savedFeatureEntity = await featureEntity.save({ session });

    // Update the Property with the FeaturedEntity reference
    property.feature_details = savedFeatureEntity._id;
    property.is_feature = true;
    await property.save({ session });

    // --------------Update Featured Listing Revenue-----------------
    const currentDate = new Date().toISOString().split("T")[0];
    await updateAdminRevenue(
      transaction_price,
      "featured_revenue",
      currentDate
    );
    // ------------------------------------------------------------

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // --------------log payment history-----------------
    const realtor = await Realtor.findById(property.owner_id);
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

    // --------------Send Notification-----------------
    await sendNotification(
      property.owner_id._id,
      "Property",
      property._id,
      "Your Property is Now Featured",
      `Congratulations! Your property "${property.title}" has been successfully featured for ${no_of_days} days.`
    );
    // -------------------------------------------------

    res.status(200).json({
      message: "Property has been successfully featured.",
      feature_details: savedFeatureEntity,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error(error);
    res
      .status(500)
      .json({ message: "Error featuring property", error: error.message });
  }
};

exports.updateProperty = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { propertyId } = req.params;
    const {
      owner_id,
      title,
      description,
      property_purpose,
      property_duration,
      property_type,
      property_subtype,
      price,
      country,
      state,
      city,
      area_size,
      bedrooms,
      bathrooms,
      charge_per,
      security_deposit,
      no_of_days,
      transaction_id,
      payment_date,
      transaction_price,
      is_feature,
      amenities,
      remove_images, // Array of image URLs to remove
      remove_videos, // Array of video URLs to remove
    } = req.body;

    // Step 1: Find the existing property
    const existingProperty = await Property.findById(propertyId).session(
      session
    );
    if (!existingProperty) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Step 2: Validate property_subtype against property_purpose if subtype is being updated
    if (
      property_subtype &&
      property_subtype !== existingProperty.property_subtype.toString()
    ) {
      const subType = await PropertySubtype.findById(property_subtype);
      if (!subType) {
        return res.status(400).json({ message: "Invalid property subtype" });
      }

      if (property_purpose && subType.property_for !== property_purpose) {
        return res.status(400).json({
          message: `Selected property subtype does not match property_purpose: ${property_purpose}`,
        });
      } else if (
        !property_purpose &&
        subType.property_for !== existingProperty.property_purpose
      ) {
        return res.status(400).json({
          message: `Selected property subtype does not match existing property_purpose: ${existingProperty.property_purpose}`,
        });
      }
    }

    // Step 3: Validate amenities if being updated
    let validAmenities = existingProperty.amenities;
    if (amenities) {
      const amenitiesArray = Array.isArray(amenities)
        ? amenities
        : JSON.parse(amenities || "[]");

      validAmenities = await Amenities.find({
        _id: {
          $in: amenitiesArray.map((id) =>
            mongoose.Types.ObjectId.createFromHexString(id)
          ),
        },
      }).session(session);

      if (validAmenities.length !== amenitiesArray.length) {
        return res
          .status(400)
          .json({ message: "One or more amenities are invalid" });
      }
    }

    // Step 4: Handle location update
    let locationUpdate = {};
    if (req.body.location) {
      const nearbyLocationsArray = Array.isArray(
        req.body.location?.nearbyLocations
      )
        ? req.body.location.nearbyLocations
        : JSON.parse(req.body.location?.nearbyLocations || "[]");

      locationUpdate = {
        ...req.body.location,
        nearbyLocations: nearbyLocationsArray,
      };

      await Location.findByIdAndUpdate(
        existingProperty.location,
        locationUpdate,
        { session }
      );
    }

    // Step 5: Handle Media updates - Fresh only approach
    let mediaUpdate = {};
    if (req.files && (req.files.images || req.files.videos)) {
      const mediaFiles = [];
      const folderName = "property_media_daar_live";

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

      // Upload new media
      const mediaUrls = await uploadMultipleToCloudinary(
        mediaFiles,
        folderName
      );

      // Delete old media from Cloudinary if it exists

      // Set fresh media only
      mediaUpdate = {
        images: mediaUrls.images || [],
        videos: mediaUrls.videos || [],
      };

      await Media.findByIdAndUpdate(existingProperty.media, mediaUpdate, {
        session,
      });
    } else if (remove_images || remove_videos) {
      // Handle selective removal if no new files but removal requested
      const existingMedia = await Media.findById(
        existingProperty.media
      ).session(session);

      if (existingMedia) {
        let updatedImages = existingMedia.images || [];
        let updatedVideos = existingMedia.videos || [];

        // Remove specified images
        if (remove_images) {
          const imagesToRemove = Array.isArray(remove_images)
            ? remove_images
            : [remove_images];
          updatedImages = updatedImages.filter(
            (img) => !imagesToRemove.includes(img)
          );

          // Delete from Cloudinary
          await Promise.all(
            imagesToRemove.map((url) => deleteFromCloudinary(url))
          );
        }

        // Remove specified videos
        if (remove_videos) {
          const videosToRemove = Array.isArray(remove_videos)
            ? remove_videos
            : [remove_videos];
          updatedVideos = updatedVideos.filter(
            (vid) => !videosToRemove.includes(vid)
          );

          // Delete from Cloudinary
          await Promise.all(
            videosToRemove.map((url) => deleteFromCloudinary(url))
          );
        }

        mediaUpdate = {
          images: updatedImages,
          videos: updatedVideos,
        };

        await Media.findByIdAndUpdate(existingProperty.media, mediaUpdate, {
          session,
        });
      }
    }

    // Step 6: Handle featured status changes
    let featureUpdate = {};
    let featureMessage = null;

    if (is_feature === "true" || is_feature === true) {
      // Check if property is already featured
      if (!existingProperty.is_featured) {
        try {
          const featureEntity = new FeaturedEntity({
            transaction_id,
            transaction_price,
            payment_date,
            no_of_days,
            is_active: true,
            property_id: existingProperty._id,
            entity_type: "property",
          });

          const savedFeaturedEntity = await featureEntity.save({ session });
          featureUpdate = {
            feature_details: savedFeaturedEntity._id,
            is_featured: true,
            property_status: "approved", // Auto-approve when featured
          };
        } catch (featureError) {
          console.error("Error adding FeaturedEntity:", featureError.message);
          featureMessage =
            "Property could not be featured. You can request a feature again.";
        }
      }
    } else if (is_feature === "false" || is_feature === false) {
      // Remove featured status if it exists
      if (existingProperty.is_featured && existingProperty.feature_details) {
        await FeaturedEntity.findByIdAndUpdate(
          existingProperty.feature_details,
          { is_active: false },
          { session }
        );
        featureUpdate = {
          is_featured: false,
          feature_details: null,
        };
      }
    }

    // Step 7: Update property status if needed
    let statusUpdate = {};
    if (
      existingProperty.property_status === "approved" &&
      (title || description || property_type || property_subtype)
    ) {
      // If changing important fields on an approved property, set back to pending
      statusUpdate.property_status = "pending";
    }

    // Step 8: Update the property
    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      {
        $set: {
          title: title || existingProperty.title,
          description: description || existingProperty.description,
          property_purpose:
            property_purpose || existingProperty.property_purpose,
          property_duration:
            property_duration || existingProperty.property_duration,
          property_type: property_type || existingProperty.property_type,
          property_subtype:
            property_subtype || existingProperty.property_subtype,
          price: price || existingProperty.price,
          country: country || existingProperty.country,
          state: state || existingProperty.state,
          city: city || existingProperty.city,
          area_size: area_size || existingProperty.area_size,
          bedrooms: bedrooms || existingProperty.bedrooms,
          bathrooms: bathrooms || existingProperty.bathrooms,
          charge_per: charge_per || existingProperty.charge_per,
          security_deposit:
            security_deposit || existingProperty.security_deposit,
          amenities: validAmenities.map((a) => a._id),
          ...statusUpdate,
          ...featureUpdate,
        },
      },
      { new: true, session }
    );

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Step 9: Return success response
    res.status(200).json({
      message:
        "Property updated successfully!" +
        (featureMessage ? ` ${featureMessage}` : ""),
      property: updatedProperty,
      media: mediaUpdate, // Return the updated media in response
    });
  } catch (error) {
    // If any error occurs, roll back the transaction
    await session.abortTransaction();
    session.endSession();

    console.error(error);
    res
      .status(500)
      .json({ message: "Error updating property", error: error.message });
  }
};

exports.getFilteredProperties = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      propertyType,
      propertySubtype,
      purpose, // 'sell' or 'rent'
      duration, // 'short_term' or 'long_term' (only for rent)
      amenities = [],
      propertyStatus = "approved", // default to approved properties
      country,
      state,
      city,
      isFeatured,
    } = req.query;

    // Build the filter object
    const filter = { property_status: propertyStatus };

    // Price range filter
    if (minPrice || maxPrice) {
      filter.$expr = {}; // Using $expr for aggregation-like comparisons

      const conditions = [];

      if (minPrice) {
        conditions.push({
          $gte: [
            { $toDouble: "$price" }, // Convert string price to number
            parseFloat(minPrice), // Convert minPrice to number
          ],
        });
      }

      if (maxPrice) {
        conditions.push({
          $lte: [
            { $toDouble: "$price" }, // Convert string price to number
            parseFloat(maxPrice), // Convert maxPrice to number
          ],
        });
      }

      // Combine conditions with AND logic
      filter.$expr.$and = conditions;
    }

    // Bedrooms filter
    if (bedrooms) {
      filter.bedrooms = { $gte: parseInt(bedrooms) };
    }

    // Bathrooms filter
    if (bathrooms) {
      filter.bathrooms = { $gte: parseInt(bathrooms) };
    }

    // Property type filter (multiple allowed)
    if (propertyType) {
      // Convert comma-separated string to array if needed
      const typeIds = Array.isArray(propertyType)
        ? propertyType
        : propertyType.split(",");

      filter.property_type = {
        $in: typeIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // Property subtype filter (multiple allowed)
    if (propertySubtype) {
      // Convert comma-separated string to array if needed
      const subtypeIds = Array.isArray(propertySubtype)
        ? propertySubtype
        : propertySubtype.split(",");

      filter.property_subtype = {
        $in: subtypeIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // Purpose filter (sell/rent)
    if (purpose) {
      filter.property_purpose = purpose;

      // Duration filter (only applicable for rentals)
      if (purpose === "rent" && duration) {
        filter.property_duration = duration;
      }
    }

    // Amenities filter (if any amenities are selected)
    if (amenities) {
      const amenityIds = Array.isArray(amenities) 
        ? amenities 
        : amenities.split(',');
      
      const validIds = amenityIds.filter(id => 
        mongoose.Types.ObjectId.isValid(id) && 
        (new mongoose.Types.ObjectId(id)).toString() === id
      );
      
      if (validIds.length > 0) {
        filter.amenities = {
          $all: validIds.map(id => new mongoose.Types.ObjectId(id))
        };
      }
    }

    // Location filters
    if (country) filter.country = country;
    if (state) filter.state = state;
    if (city) filter.city = city;

    // Featured properties filter
    if (isFeatured === "true") {
      filter.is_feature = true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalProperties = await Property.countDocuments(filter);

    // Execute query with pagination and population
    const properties = await Property.find(filter)
      .populate({
        path: "owner_id",
        select: "email full_name phone_number profile_picture",
      })
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .populate("property_type")
      .populate("property_subtype")
      .populate("amenities")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ created_at: -1 }); // Sort by newest first

    // Format the response
    const response = {
      totalProperties,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProperties / parseInt(limit)),
      properties: properties.map((property) => ({
        ...property.toObject(),
        // You can add additional formatting here if needed
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching filtered properties:", error);
    res.status(500).json({
      message: "Error fetching filtered properties",
      error: error.message,
    });
  }
};
