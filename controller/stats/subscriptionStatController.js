const Subscription = require('../../models/Subscription');
const SubscriptionPlan = require('../../models/admin/SubscriptionPlan');

exports.getTopSubscriptions = async (req, res) => {
    try {
        // Get today's start time
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const topSubscriptions = await Subscription.aggregate([
            {
                $match: { 
                    start_date: { $gte: today }, // Filter subscriptions started today
                    status: "active" // Only active subscriptions
                }
            },
            {
                $group: {
                    _id: "$productId", // Group by productId
                    plan_used: { $sum: 1 }, // Count number of subscriptions
                    total_revenue: { $sum: "$plan_details.planAmount" } // Sum of plan amounts
                }
            },
            {
                $project: {
                    _id: 0,
                    product: "$plan_details.planName", // Plan Name
                    price: "$plan_details.planAmount", // Plan Amount
                    plan_used: 1, // Number of Subscriptions
                    total_revenue: 1 // Total revenue for this plan
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
        const { plan_id } = req.query;

        // Validate if plan_id is provided
        if (!plan_id) {
            return res.status(400).json({ message: "Plan ID is required" });
        }

        // Fetch subscriptions based on plan_id and filter by active status
        const users = await Subscription.find({ plan_id, status: "active" })
            .populate("realtor_id")
            .populate({ path: "realtor_id", populate: { path: "user_id", select: "full_name email phone_number role" } })
            .populate("plan_id");

        // Format response with complete realtor details
        const formattedUsers = users.map(sub => ({
            realtor_id: sub.realtor_id?._id || "N/A",
            business_name: sub.realtor_id?.business_name || "N/A",
            business_type: sub.realtor_id?.business_type || "N/A",
            avg_rating: sub.realtor_id?.avg_rating || 0,
            user_details: {
                user_id: sub.realtor_id?.user_id?._id || "N/A",
                full_name: sub.realtor_id?.user_id?.full_name || "N/A",
                email: sub.realtor_id?.user_id?.email || "N/A",
                phone_number: sub.realtor_id?.user_id?.phone_number || "N/A",
                role: sub.realtor_id?.user_id?.role || "N/A"
            },
            plan_details: {
                plan_id: sub.plan_id?._id || "N/A",
                plan_name: sub.plan_id?.planName || "N/A",
                price: sub.plan_id?.planAmount || 0,
                duration: `${sub.plan_id?.days || 0} days`
            },
            buying_date: sub.start_date.toISOString().split("T")[0], // Format date (YYYY-MM-DD)
            status: sub.status,
        }));

        res.status(200).json(formattedUsers);
    } catch (error) {
        console.error("Error fetching paid users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

