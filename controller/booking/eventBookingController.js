const Booking = require("../../models/Booking");
const Event = require("../../models/Events");
const User = require("../../models/User");
const Review = require("../../models/Review");
const { sendEventBookingConfirmationEmail, sendEventBookingCancellationEmail } = require("../../config/mailer");
const Notification = require("../../models/Notification");
const { logPaymentHistory } = require("./paymentHistoryService");
const sendNotification = require("../notification/sendNotification");
const updateRevenue = require("./updateRevenue");
const Settings = require("../../models/admin/Settings");
const { translateText } = require("../../services/translateService")

// ✅ Book an Event
const generateTickets = (numTickets) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const tickets = new Set(); // Using a Set to ensure uniqueness

  while (tickets.size < numTickets) {
    let ticket_id = "";
    for (let j = 0; j < 8; j++) {
      ticket_id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    tickets.add(ticket_id); // Add to Set (automatically prevents duplicates)
  }

  return [...tickets].map((ticket_id) => ({ ticket_id, status: "valid" }));
};

exports.bookEvent = async (req, res) => {
  try {
    const { event_id, user_id, number_of_tickets, event_dates, guest_name, guest_email, guest_phone, id_number } = req.body;

    // Check if event exists
    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if the event allows booking
    if (!event.allow_booking) {
      return res.status(400).json({ message: "This event cannot be booked" });
    }

    // Check for existing pending booking for the same user
    let existingBooking = await Booking.findOne({
      event_id,
      user_id,
      status: "pending",
    });

    if (existingBooking) {
      // Update existing pending booking
      existingBooking.number_of_tickets = number_of_tickets;
      existingBooking.event_dates = event_dates;
      existingBooking.updated_at = new Date();

      // Generate new tickets if the number of tickets has changed
      if (existingBooking.tickets.length !== number_of_tickets) {
        existingBooking.tickets = generateTickets(number_of_tickets);
      }

      await existingBooking.save();
      return res
        .status(200)
        .json({ message: "Pending booking updated", booking: existingBooking });
    }

    // Get Owner of the Event (Admin or User)
    let owner;
    let ownerType;

    if (event.created_by === "admin") {
      owner = await Admin.findById(event.host_id).lean();
      ownerType = "Admin";
    } else {
      owner = await User.findById(event.host_id).lean();
      ownerType = "User";
    }

    if (!owner) {
      return res.status(404).json({ message: "Property owner not found" });
    }

    // Generate tickets for the new booking
    const tickets = generateTickets(number_of_tickets);

    // Create a new booking
    const newBooking = new Booking({
      booking_type: "event",
      event_id,
      user_id,
      owner_type: ownerType, 
      owner_id: owner._id, 
      number_of_tickets,
      status: "pending",
      event_dates: event_dates || [],
      tickets: tickets || [],
      tickets,
      guest_name,
      guest_email,
      guest_phone,
      id_number,
    });

    await newBooking.save();

    res.status(201).json({
      message: "Booking created, waiting for confirmation",
      booking: newBooking,
    });
  } catch (error) {
    console.error("Error in bookEvent:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Confirm Event Booking
exports.confirmEventBooking = async (req, res) => {
  try {
    const { booking_id, payment_detail } = req.body;

    // Find pending booking
    const booking = await Booking.findById(booking_id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Ensure booking is still pending
    if (booking.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Booking is not in a pending state" });
    }

    // Prevent duplicate confirmation
    if (booking.confirmation_ticket) {
      return res.status(400).json({ message: "Booking already confirmed" });
    }

    // Deduct tickets from event availability
    const event = await Event.findById(booking.event_id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const setting = await Settings.findOne().select("booking_percentage -_id");
    const booking_percentage = setting ? setting.booking_percentage : null;

    // Update booking status
    booking.status = "confirmed";
    booking.payment_detail = payment_detail;
    booking.admin_percentage = booking_percentage;
    await booking.save();

    // Send confirmation email
    await sendEventBookingConfirmationEmail(booking);

    const result = await updateRevenue(booking_id); 

    //--------------------- ✅ Notification and Payment---------------------
    await sendNotification(booking.user_id, "Booking", booking._id, "Event Booking Confirmed",
      `Your booking has been confirmed! Your confirmation ticket is ${booking.confirmation_ticket}.`
    );
    await sendNotification(booking.owner_id, "Booking", booking._id,"Event Booking Confirmed",
      "A booking for your event has been confirmed."
    );
     await logPaymentHistory(booking, payment_detail, "booking_event");
     // -------------------------------------------------------------

    res
      .status(200)
      .json({ message: "Event booking confirmed successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Cancel Event Booking
exports.cancelEventBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { cancelation_reason, cancel_by } = req.body; // Added cancel_by

    // Find booking
    const booking = await Booking.findById(booking_id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Find associated event
    const event = await Event.findById(booking.event_id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const now = new Date();

    // Ensure cancellation is allowed
    if (new Date(booking.start_date) <= now) {
      return res.status(400).json({ message: "This booking has already started and cannot be canceled." });
    }

    // Check if admin is canceling or if user is canceling within the 72-hour window
    if (cancel_by === "admin" || booking.is_cancellable) {
      try {
        // Update booking status and save
        booking.status = "canceled";
        booking.cancelation_reason = await translateText(cancelation_reason);
        booking.cancel_by = cancel_by; // Track who canceled the booking (admin or user)
        await booking.save();

        console.log("Booking canceled.");
      } catch (error) {
        console.error("Error canceling booking:", error);
      }

      const result = await updateRevenue(booking_id, true);

      // Send Cancellation Email
      await sendEventBookingCancellationEmail(booking);

      //------------------- ✅ Notification ---------------------
      // ✅ Send Notification to User
      const cancelByMessage = cancel_by === "admin" ? "by an admin" : "by you"; // Determine who canceled
      await sendNotification(
        booking.user_id,
        "Booking",
        booking._id,
        "Event Booking Canceled",
        `Your booking has been canceled ${cancelByMessage}!`
      );

      // ✅ Send Notification to Realtor
      await sendNotification(
        booking.realtor_id,
        "Booking",
        booking._id,
        "Event Booking Canceled",
        `A booking for your event has been canceled by ${cancel_by}.`
      );
      //---------------------------------------------------------

      res.status(200).json({ message: "Event booking canceled successfully", booking });
    } else {
      res.status(400).json({ message: "This booking cannot be canceled at this time" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// ✅ Get All Event Bookings (With Optional Status Filter)
exports.getAllEventBookings = async (req, res) => {
  try {
    let query = { booking_type: "event" };
    const { status } = req.query;
    if (status) query.status = status;

    // Fetch bookings with full event details
    const bookings = await Booking.find(query)
      .populate({
        path: "event_id",
        populate: [
          { path: "host_id", select: "full_name email profile_picture" }, // Get host details
          { path: "event_type", select: "name" }, // Get event type names
          {
            path: "location",
            select:
              "address city state country postal_code latitude longitude nearbyLocations",
          }, // Get full location details
          { path: "media", select: "images videos" }, // Get images & videos
          { path: "feature_details", select: "feature_name description" }, // Get feature details
        ],
      })
      .lean()
      .populate({
        path: "user_id",
        select: "full_name email profile_picture", // Only required user fields
      })

    // Fetch reviews for each event
    const bookingsWithReviews = await Promise.all(
      bookings.map(async (booking) => {
        if (!booking.event_id) return booking; // Skip if event_id is missing

        const reviews = await Review.find({
          review_for: booking.event_id._id,
          review_for_type: "Event",
        })
          .populate({
            path: "review_by",
            select: "full_name email profile_picture",
          }) // Fetch reviewer details
          .select("review_description review_rating createdAt")
          .lean();

        return {
          ...booking,
          event_id: {
            ...booking.event_id,
            reviews, // Attach event reviews
          },
        };
      })
    );

    if (!bookingsWithReviews.length) {
      return res.status(404).json({ message: "No event bookings found" });
    }

    res.status(200).json({
      message: "Bookings retrieved successfully",
      bookings: bookingsWithReviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// ✅ Get Event Booking by Booking ID
exports.getEventBookingById = async (req, res) => {
  try {
    const { booking_id } = req.params;

    // Find booking with event and user details
    const booking = await Booking.findById(booking_id)
      .populate({
        path: "event_id",
        populate: [
          { path: "host_id", select: "full_name email profile_picture" }, // Get host details
          { path: "event_type", select: "name" }, // Get event type name
          {
            path: "location",
            select:
              "address city state country postal_code latitude longitude nearbyLocations",
          }, // Get full location details
          { path: "media", select: "images videos" }, // Get images & videos
          { path: "feature_details", select: "feature_name description" }, // Get feature details
        ],
      })
      .lean()
      .populate({
        path: "user_id",
        select: "full_name email profile_picture", // Get only required user fields
      })


    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Fetch reviews for the event
    let eventReviews = [];
    if (booking.event_id) {
      eventReviews = await Review.find({
        review_for: booking.event_id._id,
        review_for_type: "Event",
      })
        .populate({
          path: "review_by",
          select: "full_name email profile_picture",
        }) // Fetch reviewer details
        .select("review_description review_rating createdAt")
        .lean()
    }

    // Attach reviews to the event
    const bookingWithReviews = {
      ...booking,
      event_id: {
        ...booking.event_id,
        reviews: eventReviews, // Add reviews to event
      },
    };

    res.status(200).json({
      message: "Booking retrieved successfully",
      booking: bookingWithReviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Get All Bookings for a Specific Event (With Optional Status Filter)
exports.getBookingsByEntitiesId = async (req, res) => {
  try {
    const { event_id, user_id, realtor_id, status } = req.query; // Query parameters

    let query = { booking_type: "event" }; // Set booking_type="event" in the query

    if (event_id) query.event_id = event_id; // Filter by event ID
    if (status) query.status = status; // Filter by status
    if (user_id) query.user_id = user_id; // Filter by user ID
    if (realtor_id) query.realtor_id = realtor_id; // Filter by realtor ID

    const bookings = await Booking.find(query)
      .populate({
        path: "event_id",
        populate: [
          { path: "host_id", select: "full_name email profile_picture" }, // Host details
          { path: "event_type", select: "name" }, // Event type name
          {
            path: "location",
            select:
              "address city state country postal_code latitude longitude nearbyLocations",
          }, // Full location details
          { path: "media", select: "images videos" }, // Event media (images & videos)
          { path: "feature_details", select: "feature_name description" }, // Event features
        ],
      })
      .lean()
      .populate({
        path: "user_id",
        select: "full_name email profile_picture", // User details
      })

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found matching the criteria" });
    }

    // Fetch event reviews and attach them to respective events
    const bookingsWithReviews = await Promise.all(
      bookings.map(async (booking) => {
        let eventReviews = [];
        if (booking.event_id && booking.event_id._id) {
          eventReviews = await Review.find({
            review_for: booking.event_id._id,
            review_for_type: "Event",
          })
            .populate({
              path: "review_by",
              select: "full_name email profile_picture",
            }) // Reviewer details
            .select("review_description review_rating createdAt")
            .lean();
        }

        return {
          ...booking,
          event_id: booking.event_id
            ? {
                ...booking.event_id,
                reviews: eventReviews, // Add reviews to event
              }
            : null, // Handle case where event_id is null
        };
      })
    );

    res.status(200).json({
      message: "Bookings retrieved successfully",
      bookings: bookingsWithReviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Get Confirmed Bookings for a Specific Event
exports.getBookedEventDetails = async (req, res) => {
  try {
    const { event_id } = req.params;

    const bookings = await Booking.find({
      event_id,
      status: { $in: ["active", "confirmed"] },
    });

    res.status(200).json(bookings.length > 0 ? bookings : []); // Return bookings or empty array
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
