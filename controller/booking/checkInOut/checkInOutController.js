const { sendCheckInOutNotifications } = require('./notificationLogHelper');
const Booking = require('../../../models/Booking');

exports.checkInOut = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!['check_in', 'check_out'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action type' });
  }

  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const now = new Date();

    if (action === 'check_in') {
      booking.check_in_out_logs.push({ check_in_time: now });
    } else {
      const lastLog = booking.check_in_out_logs?.slice().reverse().find(log => !log.check_out_time);
      if (!lastLog) return res.status(400).json({ error: 'No check-in record found to check out from' });
      lastLog.check_out_time = now;
    }

    await booking.save();

    // Send notifications
    await sendCheckInOutNotifications({ booking, action, timestamp: now });

    res.status(200).json({ message: `Successfully ${action.replace('_', ' ')}ed`, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all check-in/check-out logs along with booking details with pagination
exports.getAllCheckInOutLogsWithDetails = async (req, res) => {
  try {
    // Get page and limit from query parameters, with defaults
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
    const limit = parseInt(req.query.limit) || 10; // Default to 10 results per page

    // Calculate the number of documents to skip for pagination
    const skip = (page - 1) * limit;

    // Get the booking_type from the URL parameter (property or event)
    const { booking_type } = req.params;

    // Build query to filter bookings based on booking_type
    let query = {};
    if (booking_type) {
      // If booking_type is provided, validate it
      if (!['property', 'event'].includes(booking_type)) {
        return res.status(400).json({ error: 'Invalid booking type' });
      }
      query.booking_type = booking_type; // Filter by booking type
    }

    // Get the total number of bookings (for pagination metadata) filtered by booking_type
    const totalBookings = await Booking.countDocuments(query);

    // Get the bookings with pagination, filtered by booking_type (if provided)
    const bookings = await Booking.find(query)
      .skip(skip)
      .limit(limit)
      .populate('user_id', 'full_name email') // Populate user details if needed
      .populate('owner_id', 'full_name email') // Populate owner details if needed
      .select('check_in_out_logs booking_type property_id event_id user_id owner_id');

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'No check-in/check-out logs found' });
    }

    // Extract check-in/check-out logs with corresponding booking details
    const allLogs = bookings.map(booking => ({
      bookingDetails: {
        booking_id: booking._id,
        booking_type: booking.booking_type,
        property_id: booking.property_id,
        event_id: booking.event_id,
        user: booking.user_id,
        owner: booking.owner_id,
      },
      checkInOutLogs: booking.check_in_out_logs || [],
    }));

    // Pagination metadata
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalBookings / limit),
      totalRecords: totalBookings,
    };

    res.status(200).json({
      pagination,
      checkInOutLogsWithDetails: allLogs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllCheckLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { start, end } = req.query;

    // Convert start and end to Date if provided
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    const bookings = await Booking.find({
      check_in_out_logs: { $exists: true, $ne: [] },
    }).select(
      'booking_type property_id event_id user_id owner_id check_in_out_logs'
    );

    const checkIns = [];
    const checkOuts = [];

    bookings.forEach(booking => {
      const {
        booking_type,
        property_id,
        event_id,
        user_id,
        owner_id,
        check_in_out_logs,
      } = booking;

      check_in_out_logs.forEach(log => {
        const commonDetails = {
          booking_type,
          property_or_event_id: booking_type === 'property' ? property_id : event_id,
          user_id,
          owner_id,
        };

        if (log.check_in_time) {
          const inTime = new Date(log.check_in_time);
          if (
            (!startDate || inTime >= startDate) &&
            (!endDate || inTime <= endDate)
          ) {
            checkIns.push({
              ...commonDetails,
              timestamp: inTime,
              type: 'check_in',
            });
          }
        }

        if (log.check_out_time) {
          const outTime = new Date(log.check_out_time);
          if (
            (!startDate || outTime >= startDate) &&
            (!endDate || outTime <= endDate)
          ) {
            checkOuts.push({
              ...commonDetails,
              timestamp: outTime,
              type: 'check_out',
            });
          }
        }
      });
    });

    // Sort
    checkIns.sort((a, b) => b.timestamp - a.timestamp);
    checkOuts.sort((a, b) => b.timestamp - a.timestamp);

    // Paginate
    const checkInStart = (page - 1) * limit;
    const checkOutStart = (page - 1) * limit;

    const paginatedCheckIns = checkIns.slice(checkInStart, checkInStart + limit);
    const paginatedCheckOuts = checkOuts.slice(checkOutStart, checkOutStart + limit);

    res.json({
      page,
      limit,
      total_check_ins: checkIns.length,
      total_check_outs: checkOuts.length,
      check_ins: paginatedCheckIns,
      check_outs: paginatedCheckOuts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching check logs' });
  }
};


