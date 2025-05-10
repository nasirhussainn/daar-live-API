const Property = require("../../models/Properties");
const Event = require("../../models/Events");
const Booking = require("../../models/Booking");
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const Admin = require("../../models/Admin");
const Subscription = require("../../models/Subscription");
const AdminRevenue = require("../../models/admin/AdminRevenue");
const moment = require("moment");

// Helper function to generate date ranges
const getDateRanges = (period) => {
  const today = moment().startOf("day");
  switch (period) {
    case "24h":
      return {
        start: moment().subtract(24, "hours").toDate(),
        end: today.toDate(),
      };
    case "today":
      return {
        start: today.toDate(),
        end: moment().endOf("day").toDate(),
      };
    case "week":
      return {
        start: today.clone().subtract(7, "days").toDate(),
        end: today.toDate(),
      };
    case "month":
      return {
        start: today.clone().subtract(30, "days").toDate(),
        end: today.toDate(),
      };
    case "3months":
      return {
        start: today.clone().subtract(90, "days").toDate(),
        end: today.toDate(),
      };
    case "6months":
      return {
        start: today.clone().subtract(180, "days").toDate(),
        end: today.toDate(),
      };
    case "year":
      return {
        start: today.clone().subtract(1, "year").toDate(),
        end: today.toDate(),
      };
    case "all":
      return {
        start: new Date(0),
        end: today.toDate(),
      };
    default:
      return {
        start: today.clone().subtract(30, "days").toDate(),
        end: today.toDate(),
      };
  }
};

// Helper function to calculate growth percentage
const calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const aggregateRevenue = async (startDate1, endDate1) => {
  const result = await AdminRevenue.aggregate([
    {
      // Match records in the specified date range
      $match: {
        updated_at: { $gte: new Date(startDate1), $lte: new Date(endDate1) },
      },
    },
    {
      // Sum the relevant fields across all matched documents
      $group: {
        _id: null, // No specific grouping, sum all records
        total_revenue: { $sum: "$total_revenue" },
        admin_booking_revenue: { $sum: "$admin_booking_revenue" },
        total_booking_revenue: { $sum: "$total_booking_revenue" },
        total_percentage_revenue: { $sum: "$total_percentage_revenue" },
        subscription_revenue: { $sum: "$subscription_revenue" },
        featured_revenue: { $sum: "$featured_revenue" },
      },
    },
  ]);

  // If no records are found, return zeroes
  if (result.length === 0) {
    return {
      total_revenue: 0,
      admin_booking_revenue: 0,
      total_booking_revenue: 0,
      total_percentage_revenue: 0,
      subscription_revenue: 0,
      featured_revenue: 0,
    };
  }
  return result[0]; // Returns the aggregated result
};

exports.getAnalytics = async (req, res) => {
  try {
    const { period = "month", customStart, customEnd } = req.query;

    // Handle custom date range
    let dateRange;
    if (customStart && customEnd) {
      dateRange = {
        start: new Date(customStart),
        end: new Date(customEnd),
      };
    } else {
      dateRange = getDateRanges(period);
    }

    // Calculate previous period for comparison
    const previousPeriod = {
      start: moment(dateRange.start)
        .subtract(moment(dateRange.end).diff(dateRange.start, "days"), "days")
        .toDate(),
      end: dateRange.start,
    };

    // Format periods for AdminRevenue lookup
    const currentPeriodStr = moment(dateRange.start).format("YYYY-MM-DD");
    const previousPeriodStr = moment(previousPeriod.start).format("YYYY-MM-DD");

    // 1. Fetch all analytics data in parallel
    const [
      // Basic counts
      currentCounts,
      previousCounts,

      // Property status
      soldProperties,
      rentedBookings,
      prevSoldProperties,
      prevRentedBookings,

      // Bookings
      currentBookings,
      previousBookings,

      // Subscriptions
      currentSubscriptions,
      previousSubscriptions,

      // All-time metrics (without revenue)
      allTimeMetrics,

      // Admin Revenue
      currentAdminRevenue,
      previousAdminRevenue,

      // New booking counts for analytics: total, canceled, confirmed, live
      totalBookingCount,
      canceledBookingCount,
      confirmedBookingCount,
      liveBookingCount,
      completedBookingCount,
    ] = await Promise.all([
      // Current period counts
      Promise.all([
        Property.countDocuments({
          created_at: { $gte: dateRange.start, $lte: dateRange.end },
        }),
        Event.countDocuments({
          created_at: { $gte: dateRange.start, $lte: dateRange.end },
        }),
        User.countDocuments({
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        }),
        Realtor.countDocuments({
          created_at: { $gte: dateRange.start, $lte: dateRange.end },
        }),
      ]),

      // Previous period counts
      Promise.all([
        Property.countDocuments({
          created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end },
        }),
        Event.countDocuments({
          created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end },
        }),
        User.countDocuments({
          createdAt: { $gte: previousPeriod.start, $lte: previousPeriod.end },
        }),
        Realtor.countDocuments({
          created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end },
        }),
      ]),

      // Property status tracking - current
      Property.countDocuments({
        property_status: "sold",
        updated_at: { $gte: dateRange.start, $lte: dateRange.end },
      }),

      // Rented properties - current
      Booking.find({
        status: { $in: ["confirmed", "completed", "active"] },
        booking_type: "property",
        created_at: { $gte: dateRange.start, $lte: dateRange.end },
      }).distinct("property_id"),

      // Property status tracking - previous
      Property.countDocuments({
        property_status: "sold",
        updated_at: { $gte: previousPeriod.start, $lte: previousPeriod.end },
      }),

      // Rented properties - previous
      Booking.find({
        status: { $in: ["confirmed", "completed", "active"] },
        booking_type: "property",
        created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end },
      }).distinct("property_id"),

      // Current bookings
      Booking.find({
        status: { $in: ["confirmed", "completed", "active"] },
        created_at: { $gte: dateRange.start, $lte: dateRange.end },
      }),

      // Previous bookings
      Booking.find({
        status: { $in: ["confirmed", "completed", "active"] },
        created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end },
      }),

      // Current active subscriptions
      Subscription.countDocuments({
        status: "active",
        created_at: { $gte: dateRange.start, $lte: dateRange.end },
      }),

      // Previous active subscriptions
      Subscription.countDocuments({
        status: "active",
        created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end },
      }),

      // All-time metrics (without revenue)
      Promise.all([
        Property.countDocuments(),
        Event.countDocuments(),
        User.countDocuments(),
        Realtor.countDocuments(),
      ]),

      // Current Admin Revenue
      aggregateRevenue(currentPeriodStr, dateRange.end),

      // Previous Admin Revenue
      aggregateRevenue(previousPeriodStr, previousPeriod.end),

      // New booking counts: total, canceled, confirmed, live, completed (active statuses)
      Booking.countDocuments({
        created_at: { $gte: dateRange.start, $lte: dateRange.end },
      }),

      Booking.countDocuments({
        status: "canceled",
        created_at: { $gte: dateRange.start, $lte: dateRange.end },
      }),

      Booking.countDocuments({
        status: "confirmed",
        created_at: { $gte: dateRange.start, $lte: dateRange.end },
      }),

      Booking.countDocuments({
        status: "active",
        created_at: { $gte: dateRange.start, $lte: dateRange.end },
      }),

      Booking.countDocuments({
        status: "completed",
        created_at: { $gte: dateRange.start, $lte: dateRange.end },
      }),
    ]);

    // 2. Process and organize the data
    const [total_properties, total_events, total_users, total_realtors] =
      currentCounts;
    const [
      prev_total_properties,
      prev_total_events,
      prev_total_users,
      prev_total_realtors,
    ] = previousCounts;
    const [allTimeProperties, allTimeEvents, allTimeUsers, allTimeRealtors] =
      allTimeMetrics;

    const total_buyers = total_users - total_realtors;
    const prev_total_buyers = prev_total_users - prev_total_realtors;

    // Process Admin Revenue data
    const currentRevenueData = currentAdminRevenue || {
      total_revenue: 0,
      admin_booking_revenue: 0,
      total_booking_revenue: 0,
      total_percentage_revenue: 0,
      subscription_revenue: 0,
      featured_revenue: 0,
    };

    const prevRevenueData = previousAdminRevenue || {
      total_revenue: 0,
      admin_booking_revenue: 0,
      total_booking_revenue: 0,
      total_percentage_revenue: 0,
      subscription_revenue: 0,
      featured_revenue: 0,
    };

    // Calculate growth percentages
    const growthPercentages = {
      properties: calculateGrowth(total_properties, prev_total_properties),
      events: calculateGrowth(total_events, prev_total_events),
      users: calculateGrowth(total_users, prev_total_users),
      buyers: calculateGrowth(total_buyers, prev_total_buyers),
      realtors: calculateGrowth(total_realtors, prev_total_realtors),
      soldProperties: calculateGrowth(soldProperties, prevSoldProperties),
      rentedProperties: calculateGrowth(
        rentedBookings.length,
        prevRentedBookings.length
      ),
      // Admin revenue growth metrics
      totalRevenue: calculateGrowth(
        currentRevenueData.total_revenue,
        prevRevenueData.total_revenue
      ),
      adminBookingRevenue: calculateGrowth(
        currentRevenueData.admin_booking_revenue,
        prevRevenueData.admin_booking_revenue
      ),
      totalBookingRevenue: calculateGrowth(
        currentRevenueData.total_booking_revenue,
        prevRevenueData.total_booking_revenue
      ),
      percentageRevenue: calculateGrowth(
        currentRevenueData.total_percentage_revenue,
        prevRevenueData.total_percentage_revenue
      ),
      featuredRevenue: calculateGrowth(
        currentRevenueData.featured_revenue,
        prevRevenueData.featured_revenue
      ),
      // New growth metrics for bookings counts
      totalBookingCount: calculateGrowth(totalBookingCount, 0), // no previous data; defaulting prev=0
      canceledBookingCount: calculateGrowth(canceledBookingCount, 0),
      confirmedBookingCount: calculateGrowth(confirmedBookingCount, 0),
      liveBookingCount: calculateGrowth(liveBookingCount, 0),
      completedBookingCount: calculateGrowth(completedBookingCount, 0),
    };

    // 3. Prepare the response
    const response = {
      success: true,
      analytics: {
        period: {
          current: {
            start: dateRange.start,
            end: dateRange.end,
          },
          previous: {
            start: previousPeriod.start,
            end: previousPeriod.end,
          },
        },
        counts: {
          properties: total_properties,
          events: total_events,
          users: total_users,
          buyers: total_buyers,
          realtors: total_realtors,
          subscriptions: currentSubscriptions,
        },
        property_status: {
          sold: soldProperties,
          rented: {
            unique_properties: rentedBookings.length,
            all_bookings: currentBookings.filter(
              (b) => b.booking_type === "property"
            ).length,
          },
        },
        booking_status_counts: {
          total: totalBookingCount,
          canceled: canceledBookingCount,
          confirmed: confirmedBookingCount,
          live: liveBookingCount,
          completed: completedBookingCount,
        },
        revenue: {
          admin_revenue: {
            total: currentRevenueData.total_revenue,
            booking: {
              admin_portion: currentRevenueData.admin_booking_revenue,
              total: currentRevenueData.total_booking_revenue,
              percentage: currentRevenueData.total_percentage_revenue,
            },
            subscription: currentRevenueData.subscription_revenue,
            featured: currentRevenueData.featured_revenue,
          },
        },
        growth: {
          properties: parseFloat(growthPercentages.properties.toFixed(2)),
          events: parseFloat(growthPercentages.events.toFixed(2)),
          users: parseFloat(growthPercentages.users.toFixed(2)),
          buyers: parseFloat(growthPercentages.buyers.toFixed(2)),
          realtors: parseFloat(growthPercentages.realtors.toFixed(2)),
          sold_properties: parseFloat(
            growthPercentages.soldProperties.toFixed(2)
          ),
          rented_properties: parseFloat(
            growthPercentages.rentedProperties.toFixed(2)
          ),
          total_revenue: parseFloat(growthPercentages.totalRevenue.toFixed(2)),
          admin_booking_revenue: parseFloat(
            growthPercentages.adminBookingRevenue.toFixed(2)
          ),
          total_booking_revenue: parseFloat(
            growthPercentages.totalBookingRevenue.toFixed(2)
          ),
          percentage_revenue: parseFloat(
            growthPercentages.percentageRevenue.toFixed(2)
          ),
          featured_revenue: parseFloat(
            growthPercentages.featuredRevenue.toFixed(2)
          ),
          total_booking_count: parseFloat(
            growthPercentages.totalBookingCount.toFixed(2)
          ),
          canceled_booking_count: parseFloat(
            growthPercentages.canceledBookingCount.toFixed(2)
          ),
          confirmed_booking_count: parseFloat(
            growthPercentages.confirmedBookingCount.toFixed(2)
          ),
          live_booking_count: parseFloat(
            growthPercentages.liveBookingCount.toFixed(2)
          ),
          completed_booking_count: parseFloat(
            growthPercentages.completedBookingCount.toFixed(2)
          ),
        },
        all_time: {
          properties: allTimeProperties,
          events: allTimeEvents,
          users: allTimeUsers,
          realtors: allTimeRealtors,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics data",
      error: error.message,
    });
  }
};