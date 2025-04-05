const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const Realtor = require("../models/Realtor");
const Property = require("../models/Properties");
const FeaturedEntity = require("../models/FeaturedEntity");
const mongoose = require("mongoose");
const Settings = require("../models/admin/Settings");

const deactivateExpiredSubscriptions = async () => {
  console.log("Running subscription cleanup cron job...");

  try {
    const today = new Date();

    // Find expired subscriptions (where end_date has passed but status is still 'active')
    const expiredSubscriptions = await Subscription.find({
      end_date: { $lt: today },
      status: "active",
    });

    for (const subscription of expiredSubscriptions) {
      // Mark subscription as canceled
      subscription.status = "canceled";
      await subscription.save();

      // Check if the realtor has any other active subscriptions
      const activeSubscriptions = await Subscription.findOne({
        realtor_id: subscription.realtor_id,
        status: "active",
      });

      // If no active subscriptions remain, update realtor's is_subscribed status
      if (!activeSubscriptions) {
        await Realtor.findByIdAndUpdate(subscription.realtor_id, { is_subscribed: false });
      }
    }

    console.log(`✅ Expired subscriptions checked and updated`);
  } catch (error) {
    console.error("❌ Error in subscription cleanup cron job:", error);
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


// Schedule: Runs every day at midnight (00:00)
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running scheduled tasks...");
    await deactivateExpiredSubscriptions();
    await expireFeaturedProperties();
    await handleExpiredFreeTrials();
    console.log("✅ Scheduled tasks completed.");
  } catch (error) {
    console.error("❌ Error in scheduled tasks:", error);
  }
}, {
  timezone: "Asia/Aden"
});

module.exports = { deactivateExpiredSubscriptions, expireFeaturedProperties, handleExpiredFreeTrials };
