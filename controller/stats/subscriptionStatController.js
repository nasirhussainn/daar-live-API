const Subscription = require('../../models/Subscription');
const SubscriptionPlan = require('../../models/admin/SubscriptionPlan');

exports.getTopSubscriptions = async (req, res) => {
    try {
        // Get today's start time
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const topSubscriptions = await Subscription.aggregate([
            {
                $match: { start_date: { $gte: today } } // Filter subscriptions started today
            },
            {
                $group: {
                    _id: "$plan_id", // Group by Subscription Plan ID
                    plan_used: { $sum: 1 }, // Count number of subscriptions
                    total_price: { $sum: "$price_id" } // Sum of all price IDs (assuming price_id is numeric)
                }
            },
            {
                $lookup: {
                    from: "subscriptionplans", // Lookup plan details
                    localField: "_id",
                    foreignField: "_id",
                    as: "plan"
                }
            },
            { $unwind: "$plan" }, // Flatten plan details array
            {
                $project: {
                    _id: 0,
                    product: "$plan.name", // Plan Name
                    price: "$plan.price", // Plan Price
                    plan_used: "$plan_used" // Number of Subscriptions
                }
            },
            { $sort: { plan_used: -1 } } // Sort by most used plans
        ]);

        res.status(200).json(topSubscriptions);
    } catch (error) {
        console.error("Error fetching top subscriptions:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.getPaidUsers = async (req, res) => {
    try {
        const { plan_name, all } = req.query;

        // Build query object
        let query = {};
        if (plan_name) {
            const plan = await SubscriptionPlan.findOne({ name: plan_name });
            if (plan) {
                query.plan_id = plan._id; // Filter by selected plan ID
            } else {
                return res.status(404).json({ message: "Plan not found" });
            }
        }

        // Fetch paid users with plan details
        const users = await Subscription.find(query)
            .populate("realtor_id", "business_name user_id")
            .populate("plan_id", "name price")
            .populate({
                path: "realtor_id",
                populate: { path: "user_id", select: "full_name email" }
            });

        // Format response
        const formattedUsers = users.map(sub => ({
            user_name: sub.realtor_id?.user_id?.full_name || "Unknown",
            plan_name: sub.plan_id?.name || "Unknown Plan",
            price: sub.plan_id?.price || 0,
            buying_date: sub.start_date.toISOString().split("T")[0], // Format date (YYYY-MM-DD)
            status: sub.status,
            info: "See More"
        }));

        res.status(200).json(formattedUsers);
    } catch (error) {
        console.error("Error fetching paid users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
