const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const Realtor = require("../models/Realtor");
const Property = require("../models/Properties");
const FeaturedEntity = require("../models/FeaturedEntity");
const mongoose = require("mongoose");
const Settings = require("../models/admin/Settings");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY; // store securely

const fetchStripeSubscription = async (stripeSubscriptionId) => {
  try {
    const response = await axios.get(`https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`, {
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Stripe fetch failed for ID ${stripeSubscriptionId}:`, error.response?.data || error.message);
    return null;
  }
};

const deactivateExpiredSubscriptions = async () => {
  console.log("📆 Running subscription sync cron job...");

  try {
    const today = new Date();

    const potentialExpiredSubs = await Subscription.find({
      end_date: { $lt: today },
      status: "active",
    });

    for (const subscription of potentialExpiredSubs) {
      const stripeSub = await fetchStripeSubscription(subscription.subscription_id);

      if (!stripeSub) continue; // skip if Stripe API failed

      if (stripeSub.status === "active") {
        subscription.start_date = new Date(stripeSub.current_period_start * 1000); // Stripe uses Unix timestamps
        subscription.end_date = new Date(stripeSub.current_period_end * 1000);
        subscription.updated_at = new Date();
        await subscription.save();      
        console.log(`🔁 Updated renewed subscription for realtor ${subscription.realtor_id}`);
      } else {
        // Stripe has marked it as not active
        subscription.status = "canceled";
        await subscription.save();

        const hasActive = await Subscription.findOne({
          realtor_id: subscription.realtor_id,
          status: "active",
        });

        if (!hasActive) {
          await Realtor.findByIdAndUpdate(subscription.realtor_id, { is_subscribed: false });
        }

        console.log(`❌ Canceled expired subscription for realtor ${subscription.realtor_id}`);
      }
    }

    console.log("✅ Subscription sync completed.");
  } catch (error) {
    console.error("❌ Subscription sync error:", error.message);
  }
};


/**
 * Function to handle expired free trials
 */
const handleExpiredFreeTrials = async () => {
  console.log("Checking for expired free trials...");

  try {
    // Fetch platform settings (free_trial_days)
    const settings = await Settings.findOne();
    if (!settings) {
      console.error("Platform settings not found.");
      return;
    }

    const today = new Date();
    const freeTrialExpiryDate = new Date(today);
    freeTrialExpiryDate.setDate(today.getDate() - settings.free_trial_days); // Calculate the expiry date

    // Find realtors with expired free trials
    const realtorsWithExpiredTrials = await Realtor.find({
      has_used_free_trial: false,
      created_at: { $lt: freeTrialExpiryDate }, // Realtors who created their account before the free trial expiry date
    });    

    for (const realtor of realtorsWithExpiredTrials) {
      // Update realtor's has_used_free_trial status
      realtor.has_used_free_trial = true;
      await realtor.save();

      console.log(`Free trial expired for realtor ${realtor._id}, has_used_free_trial set to true.`);
    }

    console.log(`✅ Expired free trials checked and updated.`);
  } catch (error) {
    console.error("❌ Error in handling expired free trials:", error);
  }
};

// Expire featured properties
const expireFeaturedProperties = async () => {
  console.log("Running cron job to expire featured entities...");

  try {
    const now = new Date();
    
    // Find expired featured entities where expiration_date has passed
    const expiredFeatures = await FeaturedEntity.find({
      is_active: true,
      expiration_date: { $lte: now }, // Directly use expiration_date from schema
    });

    for (const feature of expiredFeatures) {
      if (feature.entity_type === 'property' && feature.property_id) {
        await Property.findByIdAndUpdate(feature.property_id, {
          is_feature: false,
          feature_details: null,
        });
      } else if (feature.entity_type === 'event' && feature.event_id) {
        await Event.findByIdAndUpdate(feature.event_id, { is_featured: false });
      }

      // Mark the featured entity as inactive
      await FeaturedEntity.findByIdAndUpdate(feature._id, { is_active: false });
    }

    console.log("✅ Expired featured entities have been updated.");
  } catch (error) {
    console.error("❌ Error in expiring featured entities:", error);
  }
};


// Run every 6 hours for subscription check
cron.schedule("0 */6 * * *", async () => {
  try {
    console.log("⏰ Running 6-hourly subscription expiration check...");
    await deactivateExpiredSubscriptions();
    console.log("✅ Subscription expiration task completed.");
  } catch (error) {
    console.error("❌ Error in 6-hourly subscription task:", error);
  }
}, {
  timezone: "Asia/Aden"
});

// Run once daily at midnight for featured property and trial expiration
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("🌙 Running daily tasks at midnight...");
    await expireFeaturedProperties();
    await handleExpiredFreeTrials();
    console.log("✅ Daily tasks completed.");
  } catch (error) {
    console.error("❌ Error in daily midnight tasks:", error);
  }
}, {
  timezone: "Asia/Aden"
});

module.exports = { deactivateExpiredSubscriptions, expireFeaturedProperties, handleExpiredFreeTrials };
