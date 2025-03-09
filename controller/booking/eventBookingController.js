const Booking = require("../../models/Booking");
const Event = require("../../models/Events");
const User = require("../../models/User");
const { sendEventBookingConfirmationEmail } = require("../../config/mailer");

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
    const { event_id, user_id, number_of_tickets, event_dates } = req.body;

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

    // Get Event Host
    const eventHost = await User.findById(event.host_id);
    if (!eventHost) {
      return res.status(404).json({ message: "Event host not found" });
    }

    // Generate tickets for the new booking
    const tickets = generateTickets(number_of_tickets);

    // Create a new booking
    const newBooking = new Booking({
      booking_type: "event",
      event_id,
      user_id,
      realtor_id: eventHost._id,
      number_of_tickets,
      status: "pending",
      event_dates: event_dates || [],
      tickets: tickets || [], 
      tickets,
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

    if (event.available_tickets < booking.number_of_tickets) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }

    event.available_tickets -= booking.number_of_tickets;
    await event.save();

    // Update booking status
    booking.status = "confirmed";
    booking.payment_detail = payment_detail;
    await booking.save();

    // Send confirmation email
    await sendEventBookingConfirmationEmail(booking);

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

    // Find booking
    const booking = await Booking.findById(booking_id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Find associated event
    const event = await Event.findById(booking.event_id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Ensure cancellation is allowed
    if (!booking.is_cancellable) {
      return res
        .status(400)
        .json({ message: "This booking cannot be canceled" });
    }

    // Refund tickets to event availability
    // if (booking.status === "confirmed") {
    //   event.available_tickets += booking.number_of_tickets;
    //   await event.save();
    // }

    // Update booking status
    booking.status = "canceled";
    await booking.save();

    res
      .status(200)
      .json({ message: "Event booking canceled successfully", booking });
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

    const bookings = await Booking.find(query)
      .populate("event_id")
      .populate("user_id");

    res
      .status(200)
      .json({ message: "Bookings retrieved successfully", bookings });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Get Event Booking by Booking ID
exports.getEventBookingById = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const booking = await Booking.findById(booking_id)
      .populate("event_id")
      .populate("user_id");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res
      .status(200)
      .json({ message: "Booking retrieved successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Get All Bookings for a Specific Event (With Optional Status Filter)
exports.getBookingsByEntitiesId = async (req, res) => {
  try {
    const { event_id, status, user_id, realtor_id } = req.query; // Query parameters

    let query = {}; // Base query

    if (event_id) query.event_id = event_id; // Filter by property ID if provided
    if (status) query.status = status; // Filter by status if provided
    if (user_id) query.user_id = user_id; // Filter by user ID if provided
    if (realtor_id) query.realtor_id = realtor_id; // Filter

    const bookings = await Booking.find(query)
      .populate("event_id") // Populate property details
      .populate("user_id") // Populate user details
      .populate("realtor_id"); // Populate realtor details

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found matching the criteria" });
    }

    res
      .status(200)
      .json({ message: "Bookings retrieved successfully", bookings });
  } catch (error) {
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
