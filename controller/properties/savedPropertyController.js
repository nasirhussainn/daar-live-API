const SavedProperty = require("../../models/SavedProperty");

// @desc Like a property (save property)
// @route POST /api/saved-properties/like
exports.likeProperty = async (req, res) => {
    try {
      const { user_id, property_id } = req.body;
  
      // Check if the property is already saved
      let savedProperty = await SavedProperty.findOne({ user_id, property_id });
  
      if (savedProperty) {
        if (savedProperty.status === "like") {
          return res.status(200).json({ message: "Property already liked.", savedProperty });
        }
  
        // If previously disliked, update status to like
        savedProperty.status = "like";
        await savedProperty.save();
        return res.status(200).json({ message: "Property liked successfully.", savedProperty });
      }
  
      // Save new property like
      savedProperty = new SavedProperty({ user_id, property_id, status: "like" });
      await savedProperty.save();
  
      res.status(201).json({ message: "Property liked (saved) successfully.", savedProperty });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
  

// @desc Dislike a property (remove from saved)
// @route DELETE /api/saved-properties/dislike
exports.dislikeProperty = async (req, res) => {
  try {
    const { user_id, property_id } = req.body;

    // Find and delete the saved property
    const deleted = await SavedProperty.findOneAndDelete({ user_id, property_id });

    if (!deleted) {
      return res.status(404).json({ message: "Property not found in saved list." });
    }

    res.status(200).json({ message: "Property disliked (removed) successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc Get all saved properties for a user
exports.getSavedProperties = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Get all saved properties for the user
    const savedProperties = await SavedProperty.find({ user_id }).populate("property_id");

    res.status(200).json({ savedProperties });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
