const Subscription = require("../../models/Subscription");
const Realtor = require("../../models/Realtor");
const SubscriptionPlan = require("../../models/admin/SubscriptionPlan");
const PaymentHistory = require("../../models/PaymentHistory");
const AdminRevenue = require("../../models/admin/AdminRevenue"); // AdminRevenue model
const { updateAdminRevenue } = require("../../services/updateAdminRevenue"); // AdminRevenue service
const logPaymentHistory = require("./paymentHistoryService");

// 📌 Controller to subscribe a realtor
const subscribeRealtor = async (req, res) => {
  try {
    const {
      realtor_id,
      subscription_id,
      customer_id,
      start_date,
      end_date,
      plan_id,
    } = req.body;

    // Check if the realtor exists
    const realtor = await Realtor.findById(realtor_id);
    if (!realtor) {
      return res.status(404).json({ message: "Realtor not found" });
    }

    // Check if the subscription plan exists
    const plan = await SubscriptionPlan.findById(plan_id);
    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    // Check if the realtor already has an active subscription
    const existingSubscription = await Subscription.findOne({
      realtor_id,
      status: "active",
    });

    if (existingSubscription) {
      // Cancel the existing active subscription before adding a new one
      existingSubscription.status = "canceled";
      existingSubscription.end_date = new Date(); // Set cancellation date
      existingSubscription.updated_at = Date.now();
      await existingSubscription.save();
    }

    // Create a new subscription with full plan details
    const subscription = new Subscription({
      realtor_id,
      subscription_id,
      customer_id,
      productId: plan.productId, // Ensure productId from plan is stored
      plan_details: { ...plan.toObject() }, // Store full plan object
      start_date,
      end_date,
      status: "active",
    });

    // Save the new subscription
    await subscription.save();

    // Update the realtor's `is_subscribed` status
    await Realtor.findByIdAndUpdate(realtor_id, { is_subscribed: true });

    // -------------- Log Payment History -----------------
    await logPaymentHistory({
      payer_type: "Realtor",
      payer_id: realtor_id,
      transaction_id: subscription_id,
      amount: plan.planAmount,
      entity_type: "subscription",
      entity_id: subscription._id,
    });
    // ---------------------------------------------------

    // ----------------- Update Subscription Revenue -----------------
    // Get the current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split("T")[0];
    await updateAdminRevenue(plan.planAmount, "subscription_revenue", currentDate);

    // ----------------------------------------------------------------

    return res.status(201).json({
      message: "Subscription successfully created",
      previous_subscription_status: existingSubscription ? "canceled" : "none",
      new_subscription: subscription,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 📌 Controller to get all active subscriptions (with plan details)
const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ status: "active" })
      .populate("realtor_id", "business_name")
      .populate("plan_id"); // Include subscription plan details

    res.status(200).json(subscriptions);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllSubscriptionsFull = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("realtor_id", "business_name")
      .populate("plan_id"); // Include subscription plan details

    res.status(200).json(subscriptions);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 📌 Controller to get active subscriptions for a specific realtor (with plan details)
const getRealtorSubscriptions = async (req, res) => {
  try {
    const { realtor_id } = req.params;

    // Find subscriptions and populate both the realtor and user details
    const subscriptions = await Subscription.find({
      realtor_id,
      status: "active",
    })
      .populate({
        path: "realtor_id",
        select: "business_name is_subscribed user_id",
        populate: {
          path: "user_id",
          select: "full_name email",
        },
      })
      .populate("plan_id"); // Include subscription plan details

    if (!subscriptions.length) {
      return res
        .status(404)
        .json({ message: "No active subscriptions found for this realtor" });
    }

    res.status(200).json(subscriptions);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 📌 Controller to cancel a subscription
const cancelSubscription = async (req, res) => {
  try {
    const { subscription_id } = req.params;

    // Find the subscription
    const subscription = await Subscription.findById(subscription_id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Update the status to 'inactive'
    subscription.status = "canceled";
    await subscription.save();

    // Check if the realtor has any other active subscriptions
    const activeSubscriptions = await Subscription.findOne({
      realtor_id: subscription.realtor_id,
      status: "active",
    });

    // If no active subscriptions remain, update is_subscribed to false
    if (!activeSubscriptions) {
      await Realtor.findByIdAndUpdate(subscription.realtor_id, {
        is_subscribed: false,
      });
    }

    res.status(200).json({ message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  subscribeRealtor,
  getAllSubscriptions,
  getRealtorSubscriptions,
  cancelSubscription,
  getAllSubscriptionsFull,
};
