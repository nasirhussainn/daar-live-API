const SubscriptionPlan = require('../../models/admin/SubscriptionPlan');

// Create a new subscription plan (SuperAdmin Only)
exports.createPlan = async (req, res) => {
    try {
        const { productId, days, months, planName, planDescription, noOfPropertyListing, noOfEventListing, planAmount } = req.body;

        const plan = new SubscriptionPlan({ productId, days, months, planName, planDescription, noOfPropertyListing, noOfEventListing, planAmount });
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
        const { plan_id } = req.params; // Extract plan_id from request parameters
        const { productId, days, months, planName, planDescription, noOfPropertyListing, noOfEventListing, planAmount } = req.body;

        if (!plan_id) {
            return res.status(400).json({ message: "Plan ID is required" });
        }

        const plan = await SubscriptionPlan.findByIdAndUpdate(
            plan_id, // Using _id to find the document
            { productId, days, months, planName, planDescription, noOfPropertyListing, noOfEventListing, planAmount }, // Fields to update
            { new: true } // Return updated document
        );

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
