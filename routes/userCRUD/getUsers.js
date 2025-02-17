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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default to 10 buyers per page
    const skip = (page - 1) * limit;

    const buyers = await User.find({ role: "buyer" }).skip(skip).limit(limit);
    const totalBuyers = await User.countDocuments({ role: "buyer" });

    if (!buyers.length) {
      return res.status(404).json({ message: "No buyers found." });
    }

    return res.status(200).json({
      totalPages: Math.ceil(totalBuyers / limit),
      currentPage: page,
      totalBuyers,
      buyers,
    });
  } catch (error) {
    console.error("Error fetching buyers:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.get("/realtors", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default to 10 realtors per page
    const skip = (page - 1) * limit;

    const realtors = await User.find({ role: "realtor" }).skip(skip).limit(limit);
    const totalRealtors = await User.countDocuments({ role: "realtor" });

    const realtorData = await Promise.all(
      realtors.map(async (user) => {
        const realtorDetails = await Realtor.findOne({ user_id: user._id });
        return {
          ...user.toObject(),
          realtor_details: realtorDetails || null,
        };
      })
    );

    if (!realtorData.length) {
      return res.status(404).json({ message: "No realtors found." });
    }

    return res.status(200).json({
      totalPages: Math.ceil(totalRealtors / limit),
      currentPage: page,
      totalRealtors,
      realtors: realtorData,
    });
  } catch (error) {
    console.error("Error fetching realtors:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});


module.exports = router;
