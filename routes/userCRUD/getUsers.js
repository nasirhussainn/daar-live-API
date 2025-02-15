const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");


router.get("/user-via-token/:login_token", async (req, res) => {
  try {
    const { login_token } = req.params;

    if (!login_token) {
      return res.status(400).json({ message: "Token is not provided." });
    }

    const user = await User.findOne({ login_token });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let responseData = { ...user.toObject() }; // Convert Mongoose object to plain JSON

    // If the user is a realtor, fetch realtor details
    if (user.role === "realtor") {
      const realtor = await Realtor.findOne({ user_id: user._id });

      if (realtor) {
        responseData.realtor_details = realtor; // Append realtor details to the response
      }
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.get("/user-via-id/:_id", async (req, res) => {
  try {
    const { _id } = req.params; 

    if (!_id) {
      return res.status(400).json({ message: "User ID (_id) is required." });
    }

    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let responseData = user.toObject(); // Convert Mongoose document to plain JSON

    // If the user is a realtor, fetch realtor details
    if (user.role === "realtor") {
      const realtor = await Realtor.findOne({ user_id: _id });
      if (realtor) {
        responseData.realtor_details = realtor.toObject(); // Append realtor details
      }
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.get("/user", async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: "Hi, Email and role are required." });
    }

    const user = await User.findOne({ email, role });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let responseData = { ...user.toObject() }; // Convert Mongoose object to plain JSON

    // If the user is a realtor, fetch realtor details
    if (user.role === "realtor") {
      const realtor = await Realtor.findOne({ user_id: user._id });

      if (realtor) {
        responseData.realtor_details = realtor; // Append realtor details to the response
      }
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.get("/buyers", async (req, res) => {
  try {
    const buyers = await User.find({ role: "buyer" });

    if (buyers.length === 0) {
      return res.status(404).json({ message: "No buyers found." });
    }

    return res.status(200).json(buyers);
  } catch (error) {
    console.error("Error fetching buyers:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.get("/realtors", async (req, res) => {
  try {
    // Find all users with role "realtor"
    const realtors = await User.find({ role: "realtor" });

    if (!realtors.length) {
      return res.status(404).json({ message: "No realtors found." });
    }

    // Fetch realtor details for each user
    const realtorData = await Promise.all(
      realtors.map(async (user) => {
        const realtorDetails = await Realtor.findOne({ user_id: user._id });

        return {
          ...user.toObject(), // Convert Mongoose object to plain JSON
          realtor_details: realtorDetails || null, // Include realtor details if available
        };
      })
    );

    return res.status(200).json(realtorData);
  } catch (error) {
    console.error("Error fetching realtors:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

module.exports = router;
