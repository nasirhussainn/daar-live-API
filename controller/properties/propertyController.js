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
      location, // location object { address, city, state, country, ... }
    //   amenities, // Array of amenity IDs
    area_size, // Add this
    bedrooms, // Add this
    bathrooms,
    } = req.body;

    // Step 2: Validate property_subtype against property_for
    const subType = await PropertySubtype.findById(property_subtype);
    if (!subType) {
      return res.status(400).json({ message: "Invalid property subtype" });
    }

    if (subType.property_for !== property_for) {
      return res
        .status(400)
        .json({
          message: `Selected property subtype does not match property_for: ${property_for}`,
        });
    }

    // Step 3: Validate amenities (ensure all provided amenity IDs exist)
    // const validAmenities = await Amenities.find({ _id: { $in: amenities } });
    // if (validAmenities.length !== amenities.length) {
    //   return res
    //     .status(400)
    //     .json({ message: "One or more amenities are invalid" });
    // }

    // Step 4: Create a new Location
    const locationData = new Location(location);
    const savedLocation = await locationData.save({ session });

    // Step 5: Create a new Property
    const propertyData = new Property({
      owner_id,
      title,
      description,
      property_for,
      property_type,
      property_subtype,
      price,
      location: savedLocation._id, // Associate property with the saved location
    //   amenities: validAmenities.map((a) => a._id), // Store only valid amenity IDs
      area_size, // Add this
      bedrooms, // Add this
      bathrooms,
    });
    const savedProperty = await propertyData.save({ session });

    // Step 6: Handle Media uploadMultiple for the Property
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

    // Step 7: Create Media records for the Property
    if (mediaUrls.images.length > 0 || mediaUrls.videos.length > 0) {
      const mediaData = new Media({
        entity: savedProperty._id, // Associate media with the property
        entity_type: "property",
        images: mediaUrls.images,
        videos: mediaUrls.videos,
      });
      await mediaData.save({ session });
    }

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
        .populate("location") // Fetch location details
        .populate("property_type") // Fetch property type details
        .populate("property_subtype") // Fetch property subtype details
        .populate({
          path: "media",
          model: "Media",
        });
  
      res.status(200).json(properties);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching properties", error: error.message });
    }
  };
  