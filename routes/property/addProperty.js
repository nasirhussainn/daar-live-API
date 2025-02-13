const express = require('express');
const mongoose = require('mongoose');
const Property = require('../../models/Properties');
const Location = require('../../models/Location');
const Media = require('../../models/Media');

const router = express.Router();

// Add Property API
router.post('/add-property', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Step 1: Extract data from the request body
    const { 
      title, 
      description, 
      property_for, 
      property_type, 
      property_subtype, 
      price, 
      location, // location object { address, city, state, country, ... }
      media // media object { images, videos }
    } = req.body;

    // Step 2: Create a new Location
    const locationData = new Location(location);
    const savedLocation = await locationData.save({ session });
    
    // Step 3: Create a new Property
    const propertyData = new Property({
      title,
      description,
      property_for,
      property_type,
      property_subtype,
      price,
      location_id: savedLocation._id, // Associate property with the saved location
    });
    const savedProperty = await propertyData.save({ session });
    
    // Step 4: Create Media records for the Property
    if (media && (media.images || media.videos)) {
      const mediaData = new Media({
        entity: savedProperty._id, // Associate media with the property
        entity_type: 'property',
        images: media.images || [],
        videos: media.videos || [],
      });
      await mediaData.save({ session });
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    // Step 5: Return success response
    res.status(201).json({
      message: 'Property added successfully!',
      property: savedProperty,
    });

  } catch (error) {
    // If any error occurs, roll back the transaction
    await session.abortTransaction();
    session.endSession();
    
    console.error(error);
    res.status(500).json({ message: 'Error adding property', error: error.message });
  }
});

module.exports = router;
