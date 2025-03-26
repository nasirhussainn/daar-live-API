const mongoose = require("mongoose");
const Realtor = require("../models/Realtor");
const Settings = require("../models/admin/Settings");
const Subscription = require("../models/Subscription");
const SubscriptionPlan = require("../models/admin/SubscriptionPlan");
const Property = require("../models/Properties");
const Event = require("../models/Events");
const Admin = require("../models/Admin");

console.log("Subscription Limits Helper: Dependencies loaded");

/**
 * Determines if creator is Admin or User
 */
async function determineCreatedBy(owner_id) {
  console.log(`Determining creator type for ID: ${owner_id}`);
  const isAdmin = await Admin.exists({ _id: owner_id });
  const creatorType = isAdmin ? "Admin" : "User";
  console.log(`Creator type determined: ${creatorType}`);
  return creatorType;
}

const validateSubscriptionLimits = async ({ userId, entityType, session }) => {
  console.log(`\n--- Starting validation for ${entityType} by user ${userId} ---`);

  // Step 1: Check if user is an Admin
  const createdBy = await determineCreatedBy(userId);
  if (createdBy === "Admin") {
    console.log("Admin detected - skipping limits validation");
    return;
  }

  // Step 2: Fetch realtor and settings
  console.log("Fetching realtor profile...");
  const realtor = await Realtor.findOne({ user_id: userId }).session(session);
  if (!realtor) {
    console.error("Realtor not found in database");
    throw new Error("Realtor profile not found.");
  }
  console.log(`Realtor found: ${realtor._id}, Subscribed: ${realtor.is_subscribed}`);

  console.log("Fetching platform settings...");
  const settings = await Settings.findOne().session(session);
  if (!settings) {
    console.error("Platform settings not found");
    throw new Error("Platform settings not found.");
  }

  // Step 3: Determine max allowed listings
  let maxAllowed;
  if (!realtor.is_subscribed) {
    console.log("Checking FREE TRIAL limits...");
    maxAllowed = entityType === "property" 
      ? settings.free_trial_properties 
      : settings.free_trial_events;
    console.log(`Free trial limits - ${entityType}: ${maxAllowed}`);
  } else {
    console.log("Checking PAID SUBSCRIPTION limits...");
    const subscription = await Subscription.findOne({
      realtor_id: realtor._id,
      status: "active"
    }).session(session);

    if (!subscription) {
      console.error("No active subscription found for realtor");
      throw new Error("Active subscription not found.");
    }

    console.log(`Active subscription found: ${subscription._id}`);
    
    // Use plan_details from subscription instead of fetching SubscriptionPlan
    if (!subscription.plan_details) {
      console.error("Plan details not found in subscription");
      throw new Error("Subscription plan details not found.");
    }

    maxAllowed = entityType === "property" 
      ? subscription.plan_details.noOfPropertyListing 
      : subscription.plan_details.noOfEventListing;
    console.log(`Plan limits (from subscription) - ${entityType}: ${maxAllowed}`);
  }

  // Step 4: Count current active listings
  console.log(`Counting existing ${entityType} listings...`);
  let currentCount;
  if (entityType === "property") {
    currentCount = await Property.countDocuments({
      owner_id: userId,
      property_status: { $nin: ["sold", "disapproved"] }
    }).session(session);
  } else {
    currentCount = await Event.countDocuments({
      host_id: userId,
      status: { $ne: "completed" }
    }).session(session);
  }
  console.log(`Current active ${entityType} count: ${currentCount}`);

  // Step 5: Validate limit
  if (currentCount >= maxAllowed) {
    const errorMsg = `Limit reached (${currentCount}/${maxAllowed} ${entityType}s)`;
    console.error(`VALIDATION FAILED: ${errorMsg}`);
    throw new Error(
      `You've reached your limit of ${maxAllowed} ${entityType}s. ${
        !realtor.is_subscribed ? "Upgrade your subscription to add more." : ""
      }`
    );
  }

  console.log(`VALIDATION PASSED: User can add new ${entityType}`);
};

module.exports = { validateSubscriptionLimits };