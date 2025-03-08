const mongoose = require("mongoose");
const Property = require("../../models/Properties");
const Location = require("../../models/Location");
const Media = require("../../models/Media");
const Amenities = require("../../models/admin/Amenities");
const PropertySubtype = require("../../models/admin/PropertySubtype");
const FeaturedEntity = require("../../models/FeaturedEntity");
const SavedProperty = require("../../models/SavedProperty");
const Review = require("../../models/Review");
const Booking = require("../../models/Booking");
const { uploadMultipleToCloudinary } = require("../../config/cloudinary"); // Import cloudinary helper

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

    console.log(req.body);

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

      const folderName = "uploaded_properties_daar_live";
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
    let created_by = owner_id ? "realtor" : "admin";

    if (property_purpose === "sell") {
      allow_booking = false; // If purpose is "sell", disable booking
    }

    if (is_feature === "true" || is_feature === true) {
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
    let { page, limit, featured, user_id } = req.query;
    page = parseInt(page) || 1; // Default page = 1
    limit = parseInt(limit) || 10; // Default limit = 10

    const skip = (page - 1) * limit;

    // Build query object
    const query = {};
    if (featured === "true") {
      query.is_feature = true;
    }

    // Fetch total count (for frontend pagination)
    const totalProperties = await Property.countDocuments(query);

    // Fetch properties with pagination & filter
    const properties = await Property.find(query)
      .populate("owner_id")
      .populate("location")
      .populate("media")
      .populate("feature_details")
      .populate("property_type")
      .populate("property_subtype")
      .populate("booking_id")
      .skip(skip)
      .limit(limit);

    // Fetch amenities details and saved status
    const propertiesWithDetails = await Promise.all(
      properties.map(async (property) => {
        const amenitiesDetails = await Amenities.find({
          _id: { $in: property.amenities },
        });

        const reviewDetails = await Review.find({
          review_for: property._id,
          review_for_type: "Property",
        })
        .populate("review_by")

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

        return {
          ...property.toObject(),
          amenities: amenitiesDetails, // Replace IDs with actual amenities details
          review: reviewDetails,
          saved_status: savedStatus, // Include saved property status
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
      .populate("owner_id")
      .populate("location") // Fetch location details
      .populate("media")
      .populate("feature_details")
      .populate("property_type") // Fetch property type details
      .populate("property_subtype") // Fetch property subtype details
      .populate("booking_id");

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Fetch amenities details
    const amenitiesDetails = await Amenities.find({
      _id: { $in: property.amenities },
    });

    const reviewDetails = await Review.find({
      review_for: property._id, // Ensure property is defined
      review_for_type: "Property",
    }).populate({
      path: "review_by", // Reference field in Review model
      select: "full_name email profile_picture", // Specify fields to return (optional)
    });
    

    // Default status as 'unlike'
    let saved_status = "unlike";

    // If user_id is provided, check if the user has liked the property
    if (user_id) {
      const savedProperty = await SavedProperty.findOne({ user_id, property_id: id });

      if (savedProperty && savedProperty.status === "like") {
        saved_status = "like";
      }
    }

    res.status(200).json({
      ...property.toObject(),
      amenities: amenitiesDetails,
      reviews: reviewDetails,
      saved_status, // Include saved status
    });
  } catch (error) {
    console.error(error);
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
      .populate("owner_id") // Fetch owner details
      .populate("location") // Fetch location details
      .populate("media")
      .populate("feature_details")
      .populate("property_type") // Fetch property type details
      .populate("property_subtype") // Fetch property subtype details
      .populate("booking_id")
      .skip(skip)
      .limit(limit);

    if (!properties.length) {
      return res
        .status(404)
        .json({ message: "No properties found for this owner" });
    }

    // Fetch amenities details for each property
    const propertiesWithAmenities = await Promise.all(
      properties.map(async (property) => {
        const amenitiesDetails = await Amenities.find({
          _id: { $in: property.amenities },
        });

        const reviewDetails = await Review.find({
          review_for: property._id,
          review_for_type: "Property",
        });

        return {
          ...property.toObject(),
          amenities: amenitiesDetails, // Replace IDs with actual amenities details
          reviews: reviewDetails, // Replace IDs with actual review details
        };
      })
    );

    res.status(200).json({
      totalProperties,
      currentPage: page,
      totalPages: Math.ceil(totalProperties / limit),
      properties: propertiesWithAmenities,
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

    const savedFeatureEntity = await featureEntity.save({ session });

    // Update the Property with the FeaturedEntity reference
    property.feature_details = savedFeatureEntity._id;
    property.is_feature = true;
    await property.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

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
    if (!propertyId) {
      return res.status(400).json({ message: "Property ID is required" });
    }

    let updateFields = { ...req.body }; // Only update provided fields

    // Check if property exists
    const existingProperty = await Property.findById(propertyId).populate(
      "media location"
    );
    if (!existingProperty) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Validate property_subtype (if updating)
    if (updateFields.property_subtype) {
      const subType = await PropertySubtype.findById(
        updateFields.property_subtype
      );
      if (!subType || subType.property_for !== updateFields.property_purpose) {
        return res.status(400).json({
          message: `Invalid property subtype for the selected property_purpose: ${updateFields.property_purpose}`,
        });
      }
    }

    // Validate amenities (if updating)
    if (updateFields.amenities) {
      const amenitiesArray = Array.isArray(updateFields.amenities)
        ? updateFields.amenities
        : JSON.parse(updateFields.amenities);

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

      updateFields.amenities = validAmenities.map((a) => a._id);
    }

    // Handle location update (if provided)
    if (updateFields.location) {
      const nearbyLocationsArray = Array.isArray(
        updateFields.location?.nearbyLocations
      )
        ? updateFields.location.nearbyLocations
        : JSON.parse(updateFields.location?.nearbyLocations || "[]");

      const locationData = new Location({
        ...updateFields.location,
        nearbyLocations: nearbyLocationsArray,
      });

      const savedLocation = await locationData.save({ session });
      updateFields.location = savedLocation._id;
    }

    // Handle media update (if provided)
    if (req.files && (req.files.images || req.files.videos)) {
      let mediaFiles = [];

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

      const folderName = "uploaded_properties_daar_live";
      const mediaUrls = await uploadMultipleToCloudinary(
        mediaFiles,
        folderName
      );

      // Update media record
      if (existingProperty.media) {
        await Media.findByIdAndUpdate(existingProperty.media._id, {
          images: mediaUrls.images,
          videos: mediaUrls.videos,
        });
      } else {
        const newMedia = new Media({
          images: mediaUrls.images,
          videos: mediaUrls.videos,
        });
        const savedMedia = await newMedia.save({ session });
        updateFields.media = savedMedia._id;
      }
    }

    // Handle is_feature update
    if (updateFields.is_feature !== undefined) {
      updateFields.is_featured =
        updateFields.is_feature === "true" || updateFields.is_feature === true;

      if (updateFields.is_featured) {
        // Create or update FeaturedEntity
        let featureEntity = await FeaturedEntity.findOne({
          property_id: propertyId,
        });

        if (!featureEntity) {
          featureEntity = new FeaturedEntity({
            transaction_id: updateFields.transaction_id,
            transaction_price: updateFields.transaction_price,
            payment_date: updateFields.payment_date,
            no_of_days: updateFields.no_of_days,
            is_active: true,
            property_id: propertyId,
            entity_type: "property",
          });

          await featureEntity.save({ session });
        }

        updateFields.feature_details = featureEntity._id;
      } else {
        // If unfeatured, remove reference
        updateFields.feature_details = null;
      }
    }

    // Update the property with only provided fields
    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      { $set: updateFields },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Property updated successfully",
      property: updatedProperty,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res
      .status(500)
      .json({ message: "Error updating property", error: error.message });
  }
};
