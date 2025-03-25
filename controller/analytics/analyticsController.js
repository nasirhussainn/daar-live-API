const Property = require("../../models/Properties");
const Event = require("../../models/Events");
const Booking = require("../../models/Booking");
const User = require("../../models/User");
const Realtor = require("../../models/Realtor");
const Admin = require("../../models/Admin");
const Subscription = require("../../models/Subscription");
const PaymentHistory = require("../../models/PaymentHistory");
const moment = require("moment");

// Helper function to generate date ranges
const getDateRanges = (period) => {
  const today = moment().startOf('day');
  switch (period) {
    case '24h':
      return {
        start: moment().subtract(24, 'hours').toDate(),
        end: today.toDate()
      };
    case 'today':
      return {
        start: today.toDate(),
        end: moment().endOf('day').toDate()
      };
    case 'week':
      return {
        start: today.clone().subtract(7, 'days').toDate(),
        end: today.toDate()
      };
    case 'month':
      return {
        start: today.clone().subtract(30, 'days').toDate(),
        end: today.toDate()
      };
    case '3months':
      return {
        start: today.clone().subtract(90, 'days').toDate(),
        end: today.toDate()
      };
    case '6months':
      return {
        start: today.clone().subtract(180, 'days').toDate(),
        end: today.toDate()
      };
    case 'year':
      return {
        start: today.clone().subtract(1, 'year').toDate(),
        end: today.toDate()
      };
    case 'all':
      return {
        start: new Date(0),
        end: today.toDate()
      };
    default:
      return {
        start: today.clone().subtract(30, 'days').toDate(),
        end: today.toDate()
      };
  }
};

// Helper function to calculate growth percentage
const calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

exports.getAnalytics = async (req, res) => {
  try {
    const { period = 'month', customStart, customEnd } = req.query;

    // Handle custom date range
    let dateRange;
    if (customStart && customEnd) {
      dateRange = {
        start: new Date(customStart),
        end: new Date(customEnd)
      };
    } else {
      dateRange = getDateRanges(period);
    }

    // Calculate previous period for comparison
    const previousPeriod = {
      start: moment(dateRange.start).subtract(
        moment(dateRange.end).diff(dateRange.start, 'days'), 
        'days'
      ).toDate(),
      end: dateRange.start
    };

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
      currentSubscriptionRevenue,
      previousSubscriptionRevenue,
      
      // All-time metrics
      allTimeMetrics
    ] = await Promise.all([
      // Current period counts
      Promise.all([
        Property.countDocuments({ 
          created_at: { $gte: dateRange.start, $lte: dateRange.end }
        }),
        Event.countDocuments({ 
          created_at: { $gte: dateRange.start, $lte: dateRange.end }
        }),
        User.countDocuments({ 
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }),
        Realtor.countDocuments({ 
          created_at: { $gte: dateRange.start, $lte: dateRange.end }
        })
      ]),
      
      // Previous period counts
      Promise.all([
        Property.countDocuments({ 
          created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end }
        }),
        Event.countDocuments({ 
          created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end }
        }),
        User.countDocuments({ 
          createdAt: { $gte: previousPeriod.start, $lte: previousPeriod.end }
        }),
        Realtor.countDocuments({ 
          created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end }
        })
      ]),
      
      // Property status tracking - current
      Property.countDocuments({ 
        property_status: 'sold',
        updated_at: { $gte: dateRange.start, $lte: dateRange.end }
      }),
      
      // Rented properties - current
      Booking.find({
        status: { $in: ['confirmed', 'completed', 'active'] },
        booking_type: 'property',
        created_at: { $gte: dateRange.start, $lte: dateRange.end }
      }).distinct('property_id'),
      
      // Property status tracking - previous
      Property.countDocuments({ 
        property_status: 'sold',
        updated_at: { $gte: previousPeriod.start, $lte: previousPeriod.end }
      }),
      
      // Rented properties - previous
      Booking.find({
        status: { $in: ['confirmed', 'completed', 'active'] },
        booking_type: 'property',
        created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end }
      }).distinct('property_id'),
      
      // Current bookings for revenue calculation
      Booking.find({
        status: { $in: ['confirmed', 'completed', 'active'] },
        created_at: { $gte: dateRange.start, $lte: dateRange.end }
      }),
      
      // Previous bookings for revenue calculation
      Booking.find({
        status: { $in: ['confirmed', 'completed', 'active'] },
        created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end }
      }),
      
      // Current active subscriptions
      Subscription.countDocuments({
        status: 'active',
        created_at: { $gte: dateRange.start, $lte: dateRange.end }
      }),
      
      // Previous active subscriptions
      Subscription.countDocuments({
        status: 'active',
        created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end }
      }),
      
      // Current subscription revenue
      PaymentHistory.aggregate([
        {
          $match: {
            entity_type: 'subscription',
            created_at: { $gte: dateRange.start, $lte: dateRange.end },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      
      // Previous subscription revenue
      PaymentHistory.aggregate([
        {
          $match: {
            entity_type: 'subscription',
            created_at: { $gte: previousPeriod.start, $lte: previousPeriod.end },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      
      // All-time metrics
      Promise.all([
        Property.countDocuments(),
        Event.countDocuments(),
        User.countDocuments(),
        Realtor.countDocuments(),
        PaymentHistory.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ])
    ]);

    // 2. Process and organize the data
    // Destructure counts
    const [total_properties, total_events, total_users, total_realtors] = currentCounts;
    const [prev_total_properties, prev_total_events, prev_total_users, prev_total_realtors] = previousCounts;
    const [allTimeProperties, allTimeEvents, allTimeUsers, allTimeRealtors, allTimeRevenue] = allTimeMetrics;

    const total_buyers = total_users - total_realtors;
    const prev_total_buyers = prev_total_users - prev_total_realtors;

    // Process subscription revenue
    const currentSubRevenue = currentSubscriptionRevenue[0]?.total || 0;
    const prevSubRevenue = previousSubscriptionRevenue[0]?.total || 0;
    const allTimeRevenueTotal = allTimeRevenue[0]?.total || 0;

    // Calculate growth percentages
    const growthPercentages = {
      properties: calculateGrowth(total_properties, prev_total_properties),
      events: calculateGrowth(total_events, prev_total_events),
      users: calculateGrowth(total_users, prev_total_users),
      buyers: calculateGrowth(total_buyers, prev_total_buyers),
      realtors: calculateGrowth(total_realtors, prev_total_realtors),
      soldProperties: calculateGrowth(soldProperties, prevSoldProperties),
      rentedProperties: calculateGrowth(rentedBookings.length, prevRentedBookings.length),
      subscriptionRevenue: calculateGrowth(currentSubRevenue, prevSubRevenue),
    };

    // Calculate property utilization
    const totalActiveProperties = await Property.countDocuments({
      $or: [
        { property_status: 'sold' },
        { property_status: 'active' }
      ]
    });
   
    // 3. Prepare the response
    const response = {
      success: true,
      analytics: {
        period: {
          current: {
            start: dateRange.start,
            end: dateRange.end
          },
          previous: {
            start: previousPeriod.start,
            end: previousPeriod.end
          }
        },
        counts: {
          properties: total_properties,
          events: total_events,
          users: total_users,
          buyers: total_buyers,
          realtors: total_realtors,
          subscriptions: currentSubscriptions
        },
        property_status: {
          sold: soldProperties,
          rented: {
            unique_properties: rentedBookings.length,
            all_bookings: currentBookings.filter(b => b.booking_type === 'property').length
          },
        },
        revenue: {
          subscription: currentSubRevenue,
          all_time: allTimeRevenueTotal
        },
        growth: {
          properties: parseFloat(growthPercentages.properties.toFixed(2)),
          events: parseFloat(growthPercentages.events.toFixed(2)),
          users: parseFloat(growthPercentages.users.toFixed(2)),
          buyers: parseFloat(growthPercentages.buyers.toFixed(2)),
          realtors: parseFloat(growthPercentages.realtors.toFixed(2)),
          sold_properties: parseFloat(growthPercentages.soldProperties.toFixed(2)),
          rented_properties: parseFloat(growthPercentages.rentedProperties.toFixed(2)),
          subscription_revenue: parseFloat(growthPercentages.subscriptionRevenue.toFixed(2)),
        },

        all_time: {
          properties: allTimeProperties,
          events: allTimeEvents,
          users: allTimeUsers,
          realtors: allTimeRealtors,
          revenue: allTimeRevenueTotal
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in getAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
};