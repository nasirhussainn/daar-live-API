const SubscriptionPlan = require('../../models/admin/SubscriptionPlan');

// Create a new subscription plan (SuperAdmin Only)
exports.createPlan = async (req, res) => {
    try {
        const { name, duration, price, details, price_id } = req.body;

        const plan = new SubscriptionPlan({ name, duration, price, details, price_id });
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
        const { name, duration, price, details } = req.body;
        const plan = await SubscriptionPlan.findByIdAndUpdate(
            req.params.id,
            { name, duration, price, details },
            { new: true }
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
