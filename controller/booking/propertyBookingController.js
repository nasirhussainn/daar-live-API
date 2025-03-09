const Booking = require("../../models/Booking");
const Property = require("../../models/Properties");
const User = require("../../models/User");
const { sendPropertyBookingConfirmationEmail } = require("../../config/mailer");

// Book a Property
exports.bookProperty = async (req, res) => {
  try {
    const { 
      property_id, user_id, start_date, end_date, 
      security_deposit, guest_name, guest_email, guest_phone 
    } = req.body;

    // Check if property exists
    const property = await Property.findById(property_id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Check if property allows booking
    if (!property.allow_booking) {
      return res.status(400).json({ message: "This property cannot be booked" });
    }

    // Check if the user already has a pending booking for this property
    let existingPendingBooking = await Booking.findOne({
      property_id,
      user_id,
      status: "pending"
    });

    if (existingPendingBooking) {
      // If the user wants to modify the pending booking, update it
      existingPendingBooking.start_date = start_date;
      existingPendingBooking.end_date = end_date;
      existingPendingBooking.security_deposit = security_deposit;
      existingPendingBooking.guest_name = guest_name || null;
      existingPendingBooking.guest_email = guest_email || null;
      existingPendingBooking.guest_phone = guest_phone || null;
      existingPendingBooking.updated_at = new Date();

      await existingPendingBooking.save();

      return res.status(200).json({ 
        message: "Pending booking updated", 
        booking: existingPendingBooking 
      });
    }

    // Check for overlapping confirmed/active/pending bookings
    const existingBooking = await Booking.findOne({
      property_id,
      status: { $in: ["active", "confirmed", "pending"] }, // Active bookings
      $or: [{ start_date: { $lt: end_date }, end_date: { $gt: start_date } }],
    });

    if (existingBooking) {
      return res.status(400).json({ message: "Property is already booked for the selected dates" });
    }

    // Get Realtor (Owner of the property)
    const realtor = await User.findById(property.owner_id);
    if (!realtor) return res.status(404).json({ message: "Property owner not found" });

    // Create a new booking with "pending" status
    const newBooking = new Booking({
      booking_type: "property",
      property_id,
      user_id,
      realtor_id: realtor._id,
      start_date,
      end_date,
      security_deposit,
      status: "pending", // Booking starts as "pending"
      guest_name: guest_name || null, 
      guest_email: guest_email || null, 
      guest_phone: guest_phone || null
    });

    await newBooking.save();

    res.status(201).json({ 
      message: "Booking created, waiting for payment confirmation", 
      booking: newBooking 
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


exports.confirmPropertyBooking = async (req, res) => {
  try {
    const { booking_id, payment_detail } = req.body;

    // Find the pending booking
    const booking = await Booking.findById(booking_id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Ensure the booking is still pending
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Booking is not in a pending state" });
    }

    // Prevent overwriting existing confirmation ticket
    if (booking.confirmation_ticket) {
      return res.status(400).json({ message: "Booking already confirmed" });
    }

    // Update booking details
    booking.status = "confirmed";
    booking.payment_detail = payment_detail;
    await booking.save(); // This will trigger the pre-validation hook to generate a ticket

    await sendPropertyBookingConfirmationEmail(booking);

    res.status(200).json({ 
      message: "Booking confirmed successfully", 
      booking 
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Cancel Booking
exports.cancelPropertyBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;

    // Find booking by ID
    const booking = await Booking.findById(booking_id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Find associated property
    const property = await Property.findById(booking.property_id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Check if cancellation is allowed
    if (!booking.is_cancellable) {
      return res.status(400).json({ message: "This booking cannot be canceled" });
    }

    // Update booking status to "canceled"
    booking.status = "canceled";
    await booking.save();

    // Mark Property as available again
    property.is_booked = false;
    property.booking_id = null;
    await property.save();

    res.status(200).json({ message: "Booking canceled successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Get All Bookings with Optional Status Filter
exports.getAllPropertyBookings = async (req, res) => {
    try {
      const { status } = req.query; // Optional filter
  
      let query = {}; // Default: fetch all bookings
      if (status) query.status = status; // Apply status filter if provided
  
      const bookings = await Booking.find(query)
        .populate("property_id") // Populate property details
        .populate("user_id") // Populate user details
        .populate("realtor_id"); // Populate realtor details
  
      res.status(200).json({ message: "Bookings retrieved successfully", bookings });
    } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  };
  
// ✅ Get Booking by Booking ID
exports.getPropertyBookingById = async (req, res) => {
    try {
      const { booking_id } = req.params;
  
      const booking = await Booking.findById(booking_id)
        .populate("property_id") // Property details
        .populate("user_id") // User details
        .populate("realtor_id"); // Realtor details
  
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
  
      res.status(200).json({ message: "Booking retrieved successfully", booking });
    } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  };

  // ✅ Get All Bookings for a Specific Property with Optional Status Filter
  exports.getBookingsByEntitiesId = async (req, res) => {
    try {
      const { property_id, status, user_id, realtor_id } = req.query; // Query parameters
  
      let query = {}; // Base query
  
      if (property_id) query.property_id = property_id; // Filter by property ID if provided
      if (status) query.status = status; // Filter by status if provided
      if (user_id) query.user_id = user_id; // Filter by user ID if provided
      if (realtor_id) query.realtor_id = realtor_id; // Filter
  
      const bookings = await Booking.find(query)
        .populate("property_id") // Populate property details
        .populate("user_id") // Populate user details
        .populate("realtor_id"); // Populate realtor details
  
      if (bookings.length === 0) {
        return res.status(404).json({ message: "No bookings found matching the criteria" });
      }
  
      res.status(200).json({ message: "Bookings retrieved successfully", bookings });
    } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  };
  

  exports.getBookedPropertyDetails = async (req, res) => {
    try {
      const { property_id } = req.params;
  
      // Query for bookings with 'active' or 'confirmed' status
      const bookings = await Booking.find({
        property_id,
        status: { $in: ["active", "confirmed"] }, // Only active or confirmed bookings
      });
  
      res.status(200).json(bookings.length > 0 ? bookings : []); // Return bookings or empty array
    } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  };
  

  
  
