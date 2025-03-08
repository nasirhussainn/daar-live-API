const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const Subscription = require("../../models/Subscription");
const Plan = require("../../models/admin/SubscriptionPlan"); // Import Plan model
const Review = require("../../models/Review");

router.get("/user-via-token/:login_token", async (req, res) => {
  try {
    const { login_token } = req.params;
    if (!login_token) {
      return res.status(400).json({ message: "Token is not provided." });
    }

    // Find user by login_token
    const user = await User.findOne({ login_token }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let responseData = { ...user };

    // If the user is a realtor, fetch realtor & subscription details
    if (user.role === "realtor") {
      const realtor = await Realtor.findOne({ user_id: user._id }).lean();
      if (realtor) {
        responseData.realtor_details = realtor;

        // Fetch subscription
        const subscription = await Subscription.findOne({
          realtor_id: realtor._id,
          status: "active",
        }).lean();

        if (subscription) {
          responseData.subscription = subscription;

          // Fetch plan details
          const plan = await Plan.findById(subscription.plan_id).lean();
          if (plan) {
            responseData.plan_details = plan;
          }
        }

        // Fetch reviews for the realtor
        const reviews = await Review.find({ review_for: user._id, review_for_type: "User" }).lean();
        responseData.reviews = reviews;
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

    const user = await User.findById(_id).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let responseData = { ...user };

    if (user.role === "realtor") {
      const realtor = await Realtor.findOne({ user_id: _id }).lean();
      if (realtor) {
        responseData.realtor_details = realtor;

        const subscription = await Subscription.findOne({
          realtor_id: realtor._id,
          status: "active",
        }).lean();

        if (subscription) {
          responseData.subscription = subscription;

          const plan = await Plan.findById(subscription.plan_id).lean();
          if (plan) {
            responseData.plan_details = plan;
          }
        }

         // Fetch reviews for the realtor
         const reviews = await Review.find({ review_for: user._id, review_for_type: "User" }).lean();
         responseData.reviews = reviews;
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
    const { email, role } = req.query;
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required." });
    }

    const user = await User.findOne({ email, role }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let responseData = { ...user };

    if (role === "realtor") {
      const realtor = await Realtor.findOne({ user_id: user._id }).lean();
      if (realtor) {
        responseData.realtor_details = realtor;

        const subscription = await Subscription.findOne({
          realtor_id: realtor._id,
          status: "active",
        }).lean();

        if (subscription) {
          responseData.subscription_details = subscription;

          const plan = await Plan.findById(subscription.plan_id).lean();
          if (plan) {
            responseData.plan_details = plan;
          }
        }

         // Fetch reviews for the realtor
         const reviews = await Review.find({ review_for: user._id, review_for_type: "User" }).lean();
         responseData.reviews = reviews;
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
    const limit = parseInt(req.query.limit) || 10; // Default: 10 realtors per page
    const skip = (page - 1) * limit;

    // Fetch paginated realtors from User collection
    const realtors = await User.find({ role: "realtor" }).skip(skip).limit(limit).lean();
    const totalRealtors = await User.countDocuments({ role: "realtor" });

    // Fetch realtor details, subscriptions, and reviews in parallel
    const realtorData = await Promise.all(
      realtors.map(async (user) => {
        const realtorDetails = await Realtor.findOne({ user_id: user._id }).lean();
        let subscription = null;
        let reviews = [];

        if (realtorDetails) {
          subscription = await Subscription.findOne({
            realtor_id: realtorDetails._id,
            status: "active",
          }).lean();

          // Fetch reviews for the realtor
          reviews = await Review.find({ review_for: realtorDetails.user_id, review_for_type: "User" }).lean();
        }

        return {
          ...user,
          realtor_details: realtorDetails || null,
          subscription: subscription || null,
          is_subscribed: !!subscription, // Boolean flag for subscription status
          reviews, // Include reviews
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
