const mongoose = require("mongoose");
const Property = require("../../models/Properties");
const Location = require("../../models/Location");
const Media = require("../../models/Media");
const Amenities = require("../../models/admin/Amenities");
const PropertySubtype = require("../../models/admin/PropertySubtype");
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
      property_for,
      property_type,
      property_subtype,
      price,
      location,
      area_size, 
      bedrooms, 
      bathrooms,
    } = req.body;

    // Step 2: Validate property_subtype against property_for
    const subType = await PropertySubtype.findById(property_subtype);
    if (!subType) {
      return res.status(400).json({ message: "Invalid property subtype" });
    }

    if (subType.property_for !== property_for) {
      return res.status(400).json({
        message: `Selected property subtype does not match property_for: ${property_for}`,
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

    // Step 4: Create a new Location
    const locationData = new Location(location);
    const savedLocation = await locationData.save({ session });

    // Step 5: Handle Media uploadMultiple for the Property
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

      mediaUrls = await uploadMultipleToCloudinary(mediaFiles);
    }

    // Step 6: Create a new Media record
    const mediaData = new Media({
      images: mediaUrls.images,
      videos: mediaUrls.videos,
    });
    const savedMedia = await mediaData.save({ session });

    // Step 7: Create a new Property
    const propertyData = new Property({
      owner_id,
      title,
      description,
      property_for,
      property_type,
      property_subtype,
      price,
      location: savedLocation._id, // Associate property with the saved location
      media: savedMedia._id, // Associate property with the saved media
      amenities: validAmenities.map((a) => a._id), // Store only valid amenity IDs
      area_size,
      bedrooms,
      bathrooms,
    });

    const savedProperty = await propertyData.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Step 8: Return success response
    res.status(201).json({
      message: "Property added successfully!",
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
    const properties = await Property.find()
      .populate("owner_id")
      .populate("location") // Fetch location details
      .populate("media")
      .populate("property_type") // Fetch property type details
      .populate("property_subtype") // Fetch property subtype details

    // Fetch amenities details for each property
    const propertiesWithAmenities = await Promise.all(
      properties.map(async (property) => {
        const amenitiesDetails = await Amenities.find({
          _id: { $in: property.amenities },
        });

        return {
          ...property.toObject(),
          amenities: amenitiesDetails, // Replace IDs with actual amenities details
        };
      })
    );

    res.status(200).json(propertiesWithAmenities);
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

    const property = await Property.findById(id)
      .populate("owner_id")
      .populate("location") // Fetch location details
      .populate("media")
      .populate("property_type") // Fetch property type details
      .populate("property_subtype") // Fetch property subtype details

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Fetch amenities details
    const amenitiesDetails = await Amenities.find({
      _id: { $in: property.amenities },
    });

    res.status(200).json({
      ...property.toObject(),
      amenities: amenitiesDetails, 
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching property", error: error.message });
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
    await Media.deleteMany({ entity: property._id, entity_type: "property" }, { session });

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
    res.status(500).json({ message: "Error deleting property", error: error.message });
  }
};

