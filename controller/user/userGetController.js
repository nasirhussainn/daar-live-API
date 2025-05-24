const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const Subscription = require("../../models/Subscription");
const Plan = require("../../models/admin/SubscriptionPlan");
const Review = require("../../models/Review");
const { getTotalRevenue } = require("../stats/getTotalRevenue");
const { getReviewsWithCount } = require("../reviews/getReviewsWithCount");

// Get user via login token
exports.getUserByToken = async (req, res) => {
  try {
    const { login_token } = req.params;
    if (!login_token) {
      return res.status(400).json({ message: "Token is not provided." });
    }

    const user = await User.findOne({ login_token }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let responseData = await enrichUserData(user);
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// Get user via ID
exports.getUserById = async (req, res) => {
  try {
    const { _id } = req.params;
    if (!_id) {
      return res.status(400).json({ message: "User ID (_id) is required." });
    }

    const user = await User.findById(_id).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let responseData = await enrichUserData(user);
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// Get user by email and role
exports.getUserByEmailAndRole = async (req, res) => {
  try {
    const { email, role } = req.query;
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required." });
    }

    const user = await User.findOne({ email, role }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let responseData = await enrichUserData(user);
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// Get paginated buyers
exports.getBuyers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
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
};

// Get paginated realtors with additional details
exports.getRealtors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const status = req.query.status; // Get status from query params

    // Build query object
    let query = { role: "realtor" };
    if (status) {
      query.account_status = status; // Apply account_status filter if provided
    }

    const realtors = await User.find(query).skip(skip).limit(limit).lean();
    const totalRealtors = await User.countDocuments(query);

    const realtorData = await Promise.all(
      realtors.map(async (user) => {
        const realtorDetails = await Realtor.findOne({
          user_id: user._id,
        }).lean();
        let subscription = null;

        if (realtorDetails) {
          subscription = await Subscription.findOne({
            realtor_id: realtorDetails._id,
            status: "active",
          }).lean();
        }

        const reviewData = await getReviewsWithCount(user._id, "User");
        const stats = await getTotalRevenue(user._id);

        return {
          ...user,
          realtor_details: realtorDetails || null,
          subscription: subscription || null,
          is_subscribed: !!subscription,
          reviews: reviewData || [],
          stats: stats || null,
        };
      }),
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
};

// Helper function to enrich user data
const enrichUserData = async (user) => {
  let responseData = { ...user };

  if (user.role === "realtor") {
    const realtor = await Realtor.findOne({ user_id: user._id }).lean();
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

      const reviewData = await getReviewsWithCount(user._id, "User");
      responseData.reviews = reviewData;

      const stats = await getTotalRevenue(user._id);
      responseData.stats = stats;
    }
  }

  return responseData;
};
