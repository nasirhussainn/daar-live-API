const SubscriptionPlan = require("../../models/admin/SubscriptionPlan");
const { translateText } = require("../../services/translateService");

// Create a new subscription plan (SuperAdmin Only)
exports.createPlan = async (req, res) => {
  try {
    const {
      productId,
      days,
      months,
      planName,
      noOfPropertyListing,
      noOfEventListing,
      planAmount,
    } = req.body;
    const planDescription = await translateText(req.body.planDescription);

    const plan = new SubscriptionPlan({
      productId,
      days,
      months,
      planName,
      planDescription,
      noOfPropertyListing,
      noOfEventListing,
      planAmount,
    });
    await plan.save();

    res.status(201).json({ message: "Subscription Plan Created", plan });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all subscription plans
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single subscription plan by ID
exports.getPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a subscription plan (SuperAdmin Only)
exports.updatePlan = async (req, res) => {
  try {
    const { plan_id } = req.params;

    if (!plan_id) {
      return res.status(400).json({ message: "Plan ID is required" });
    }

    const updateData = {};

    // Conditionally include fields if they are provided
    if (req.body.productId) updateData.productId = req.body.productId;
    if (req.body.days) updateData.days = req.body.days;
    if (req.body.months) updateData.months = req.body.months;

    // Handle planName uniqueness check
    if (req.body.planName) {
      const existingPlan = await SubscriptionPlan.findOne({
        planName: req.body.planName,
        _id: { $ne: plan_id }, // Exclude the current plan
      });

      if (existingPlan) {
        return res
          .status(400)
          .json({
            message: "planName must be unique. This name is already used.",
          });
      }

      updateData.planName = req.body.planName;
    }

    if (req.body.noOfPropertyListing)
      updateData.noOfPropertyListing = req.body.noOfPropertyListing;
    if (req.body.noOfEventListing)
      updateData.noOfEventListing = req.body.noOfEventListing;
    if (req.body.planAmount) updateData.planAmount = req.body.planAmount;

    if (req.body.planDescription) {
      const translatedDescription = await translateText(
        req.body.planDescription,
      );
      updateData.planDescription = translatedDescription;
    }

    const plan = await SubscriptionPlan.findByIdAndUpdate(plan_id, updateData, {
      new: true,
    });

    if (!plan) return res.status(404).json({ message: "Plan not found" });

    res.status(200).json({ message: "Subscription Plan Updated", plan });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a subscription plan (SuperAdmin Only)
exports.deletePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    res.status(200).json({ message: "Subscription Plan Deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
