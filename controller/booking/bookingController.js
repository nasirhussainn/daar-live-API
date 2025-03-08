const Booking = require("../../models/Booking");
const Property = require("../../models/Properties");
const User = require("../../models/User");
const { sendBookingConfirmationEmail } = require("../../config/mailer");

// Book a Property
exports.bookProperty = async (req, res) => {
  try {
    const { property_id, user_id, start_date, end_date, payment_detail, security_deposit } = req.body;

    // Check if property exists
    const property = await Property.findById(property_id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Check if property allows booking
    if (!property.allow_booking) {
      return res.status(400).json({ message: "This property cannot be booked" });
    }

    // Check for overlapping active bookings
    const existingBooking = await Booking.findOne({
      property_id,
      status: { $in: ["active", "confirmed"] }, // Active bookings
      $or: [
        { start_date: { $lt: end_date }, end_date: { $gt: start_date } }, // Overlapping check
      ],
    });

    if (existingBooking) {
      return res.status(400).json({ message: "Property is already booked for the selected dates" });
    }

    // Get Realtor (Owner of the property)
    const realtor = await User.findById(property.owner_id);
    if (!realtor) return res.status(404).json({ message: "Property owner not found" });

    // Create a new booking
    const newBooking = new Booking({
      property_id,
      user_id,
      realtor_id: realtor._id,
      start_date,
      end_date,
      payment_detail,
      security_deposit,
      status: "confirmed", // Booking is confirmed immediately
    });

    await newBooking.save();

    // Update Property to reflect booking status
    property.is_booked = true;
    property.booking_id = newBooking._id;
    await property.save();

    // Send booking confirmation email to the user
    await sendBookingConfirmationEmail(newBooking);

    res.status(201).json({ message: "Booking successful", booking: newBooking });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Cancel Booking
exports.cancelBooking = async (req, res) => {
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
exports.getAllBookings = async (req, res) => {
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
exports.getBookingById = async (req, res) => {
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
exports.getBookingsByPropertyId = async (req, res) => {
    try {
      const { property_id } = req.params;
      const { status } = req.query; // Optional filter for status
  
      let query = { property_id }; // Base query for property
      if (status) query.status = status; // Apply status filter if provided
  
      const bookings = await Booking.find(query)
        .populate("property_id") // Property details
        .populate("user_id") // User details
        .populate("realtor_id"); // Realtor details
  
      if (bookings.length === 0) {
        return res.status(404).json({ message: "No bookings found for this property" });
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
  

  
  
