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
