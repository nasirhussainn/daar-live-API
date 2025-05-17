const Booking = require("../../models/Booking");
const Property = require("../../models/Properties");
const User = require("../../models/User");
const Admin = require("../../models/Admin");
const Review = require("../../models/Review");
const {
  sendPropertyBookingConfirmationEmail,
  sendPropertyBookingCancellationEmail,
} = require("../../config/mailer");
const Notification = require("../../models/Notification");
const { logPaymentHistory } = require("./paymentHistoryService");
const sendNotification = require("../notification/sendNotification");
const Settings = require("../../models/admin/Settings");
const updateRevenue = require("./updateRevenue");
const { translateText } = require("../../services/translateService");
const { getSuperAdminId } = require("../../services/getSuperAdminId");

const normalizeTime = (time) => {
  let date = new Date(`1970-01-01 ${time}`);
  let hours = date.getHours();
  let minutes = date.getMinutes().toString().padStart(2, "0");
  let period = hours >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format without leading zero
  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${period}`;
};

// Updated conflict checker with exclusion support
async function hasBookingConflict(propertyId, startDate, endDate, slots, excludeBookingId = null) {
  const normalizedStart = new Date(startDate);
  normalizedStart.setUTCHours(0, 0, 0, 0);
  
  const normalizedEnd = new Date(endDate);
  normalizedEnd.setUTCHours(23, 59, 59, 999);

  const query = {
    property_id: propertyId,
    status: { $in: ["active", "confirmed", "pending"] },
    $or: [
      { start_date: { $lt: normalizedEnd }, end_date: { $gt: normalizedStart } },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBookings = await Booking.find(query).select("slots");

  if (!slots || !slots.length) return conflictingBookings.length > 0;

  return conflictingBookings.some(booking => {
    return booking.slots.some(bookedSlot => {
      return slots.some(newSlot => {
        const bookedStart = normalizeTime(bookedSlot.start_time);
        const bookedEnd = normalizeTime(bookedSlot.end_time);
        const newStart = normalizeTime(newSlot.start_time);
        const newEnd = normalizeTime(newSlot.end_time);

        return (
          (newStart >= bookedStart && newStart < bookedEnd) ||
          (newEnd > bookedStart && newEnd <= bookedEnd) ||
          (newStart <= bookedStart && newEnd >= bookedEnd)
        );
      });
    });
  });
}

// Updated unavailable slots checker with exclusion support
async function hasUnavailableConflict(property, startDate, endDate, slots, excludeBookingId = null) {
  if (!property.unavailable_slots?.length) return false;

  const normalizedStart = new Date(startDate);
  normalizedStart.setUTCHours(0, 0, 0, 0);
  
  const normalizedEnd = new Date(endDate);
  normalizedEnd.setUTCHours(23, 59, 59, 999);

  // Filter unavailable slots for the date range
  const unavailableSlots = property.unavailable_slots.filter(slot => {
    const slotStart = new Date(slot.start_date);
    const slotEnd = new Date(slot.end_date);
    return slotStart <= normalizedEnd && slotEnd >= normalizedStart;
  });

  if (!unavailableSlots.length) return false;

  // For daily bookings
  if (property.charge_per !== "per_hour") return true;

  // For hourly bookings, check each slot
  return slots.some(slot => {
    const slotStart = normalizeTime(slot.start_time);
    const slotEnd = normalizeTime(slot.end_time);

    return unavailableSlots.some(unavailable => {
      const unavailableStart = normalizeTime(unavailable.start_time);
      const unavailableEnd = normalizeTime(unavailable.end_time);

      return (
        (slotStart >= unavailableStart && slotStart < unavailableEnd) ||
        (slotEnd > unavailableStart && slotEnd <= unavailableEnd) ||
        (slotStart <= unavailableStart && slotEnd >= unavailableEnd)
      );
    });
  });
}

// Helper function to get property owner
async function getPropertyOwner(property) {
  const isAdminOwner = property.created_by === "Admin";
  const owner = await (isAdminOwner 
    ? Admin.findById(property.owner_id).lean()
    : User.findById(property.owner_id).lean());
    
  return {
    owner,
    ownerType: isAdminOwner ? "Admin" : "User"
  };
}

exports.bookProperty = async (req, res) => {
  try {
    const {
      property_id,
      user_id,
      start_date,
      end_date,
      slots,
      security_deposit,
      guest_name,
      guest_email,
      guest_phone,
      id_number,
    } = req.body;

    // Validate input dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Check if property exists
    const property = await Property.findById(property_id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Check property availability
    if (!property.is_available || !property.allow_booking) {
      return res.status(400).json({
        message: "This property cannot be booked currently",
      });
    }

    // Validate hourly booking requirements
    if (property.charge_per === "per_hour") {
      if (start_date !== end_date) {
        return res.status(400).json({
          message: "For per-hour bookings, start and end date must be the same",
        });
      }
      if (!slots || !slots.length) {
        return res.status(400).json({
          message: "Time slots are required for hourly bookings",
        });
      }
    }

    // Check for existing pending booking
    const existingPendingBooking = await Booking.findOne({
      property_id,
      user_id,
      status: "pending",
    });

    if (existingPendingBooking) {
      // Create temporary booking object to validate conflicts
      const tempBooking = {
        ...existingPendingBooking.toObject(),
        start_date: startDate,
        end_date: endDate,
        slots: slots || []
      };

      // Check for conflicts with unavailable slots (excluding current booking)
      if (await hasUnavailableConflict(property, startDate, endDate, slots, existingPendingBooking._id)) {
        return res.status(400).json({
          message: property.charge_per === "per_hour"
            ? "Property is unavailable for the selected time slots"
            : "Property is unavailable for the selected dates",
        });
      }

      // Check for conflicts with existing bookings (excluding current booking)
      if (await hasBookingConflict(property_id, startDate, endDate, slots, existingPendingBooking._id)) {
        return res.status(400).json({
          message: property.charge_per === "per_hour"
            ? "Property is already booked for the selected time slots"
            : "Property is already booked for the selected dates",
        });
      }

      // Only update if no conflicts found
      existingPendingBooking.start_date = startDate;
      existingPendingBooking.end_date = endDate;
      existingPendingBooking.slots = slots || [];
      existingPendingBooking.security_deposit = security_deposit;
      existingPendingBooking.guest_name = guest_name || null;
      existingPendingBooking.guest_email = guest_email || null;
      existingPendingBooking.guest_phone = guest_phone || null;
      existingPendingBooking.id_number = id_number || null;
      existingPendingBooking.updated_at = new Date();

      await existingPendingBooking.save();

      return res.status(200).json({
        message: "Pending booking updated",
        booking: existingPendingBooking,
      });
    }

    // Check for conflicts with unavailable slots
    if (await hasUnavailableConflict(property, startDate, endDate, slots)) {
      return res.status(400).json({
        message: property.charge_per === "per_hour"
          ? "Property is unavailable for the selected time slots"
          : "Property is unavailable for the selected dates",
      });
    }

    // Check for conflicts with existing bookings
    if (await hasBookingConflict(property_id, startDate, endDate, slots)) {
      return res.status(400).json({
        message: property.charge_per === "per_hour"
          ? "Property is already booked for the selected time slots"
          : "Property is already booked for the selected dates",
      });
    }

    // Get property owner
    const { owner, ownerType } = await getPropertyOwner(property);
    if (!owner) {
      return res.status(404).json({ message: "Property owner not found" });
    }

    // Create new booking
    const newBooking = new Booking({
      booking_type: "property",
      property_id,
      user_id,
      owner_type: ownerType,
      owner_id: owner._id,
      start_date: start_date,
      end_date: end_date,
      slots: property.charge_per === "per_hour" ? slots : [],
      security_deposit,
      status: "pending",
      guest_name,
      guest_email,
      guest_phone,
      id_number,
    });

    await newBooking.save();

    res.status(201).json({
      message: "Booking created, waiting for payment confirmation",
      booking: newBooking,
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
      return res
        .status(400)
        .json({ message: "Booking is not in a pending state" });
    }

    // Prevent overwriting existing confirmation ticket
    if (booking.confirmation_ticket) {
      return res.status(400).json({ message: "Booking already confirmed" });
    }

    const setting = await Settings.findOne().select("booking_percentage -_id");
    const booking_percentage = setting ? setting.booking_percentage : null;

    // Update booking details
    booking.status = "confirmed";
    booking.payment_detail = payment_detail;
    booking.admin_percentage = booking_percentage;
    await booking.save(); // This will trigger the pre-validation hook to generate a ticket

    const result = await updateRevenue(booking_id); // 10% admin fee

    // Find associated property
    const property = await Property.findById(booking.property_id);
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    await sendPropertyBookingConfirmationEmail(booking);

    //--------------------- ✅ Notification and Payment ---------------------
    // ✅ Send notification to the user
    await sendNotification(
      booking.user_id,
      "Booking",
      booking._id,
      "Property Booking Confirmed",
      `Your booking has been confirmed! Your confirmation ticket is ${booking.confirmation_ticket}.`
    );

    // ✅ Send Notification to Realtor/Owner
    await sendNotification(
      booking.owner_id,
      "Booking",
      booking._id,
      "Property Booking Confirmed",
      "A booking for your property has been confirmed."
    );

    // ✅ Send Notification to Super Admin (avoid duplicate if owner is same admin)
    const superAdminId = await getSuperAdminId();
    if (
      superAdminId &&
      String(superAdminId) !== String(booking.owner_id) // check if different
    ) {
      await sendNotification(
        superAdminId,
        "Booking",
        booking._id,
        "New Property Booking Confirmed",
        `A new booking has been confirmed for property ID: ${booking.property_id}.`
      );
    }

    await logPaymentHistory(booking, payment_detail, "booking_property");
    // ------------------------------------------------------------------------

    res.status(200).json({
      message: "Booking confirmed successfully",
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Cancel Booking
exports.cancelPropertyBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { cancelation_reason, cancel_by } = req.body;

    // Find booking by ID
    const booking = await Booking.findById(booking_id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Find associated property
    const property = await Property.findById(booking.property_id);
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    const now = new Date();

    // If the booking has started, prevent cancellation
    if (new Date(booking.start_date) <= now) {
      return res
        .status(400)
        .json({
          message: "This booking has already started and cannot be canceled.",
        });
    }

    // Check if admin is canceling or if user is canceling within the 72-hour window
    if (cancel_by === "admin" || booking.is_cancellable) {
      // Update booking status and save
      booking.status = "canceled";
      booking.cancelation_reason = await translateText(cancelation_reason);
      booking.cancel_by = cancel_by; // Track who canceled the booking (admin or user)
      await booking.save();

      // Mark property as available again
      if (property) {
        property.is_booked = false;
        property.booking_id = null;
        await property.save();
      }

      // Update revenue based on cancellation
      const result = await updateRevenue(booking_id, true);

      // Send Cancellation Email
      await sendPropertyBookingCancellationEmail(booking);

      //------------------- ✅ Notification ---------------------
      const cancelByMessage = cancel_by === "admin" ? "by an admin" : "by you";
      // ✅ Send Notification to User
      await sendNotification(
        booking.user_id,
        "Booking",
        booking._id,
        "Booking Canceled",
        `Your booking has been canceled ${cancelByMessage}!`
      );

      // ✅ Send Notification to Realtor
      await sendNotification(
        booking.realtor_id,
        "Booking",
        booking._id,
        "Booking Canceled",
        `A booking for your property has been canceled by ${cancel_by}`
      );
      //---------------------------------------------------------

      res
        .status(200)
        .json({ message: "Booking canceled successfully", booking });
    } else {
      res
        .status(400)
        .json({ message: "This booking cannot be canceled at this time" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Get All Bookings with Optional Status Filter
exports.getAllPropertyBookings = async (req, res) => {
  try {
    let query = { booking_type: "property" }; // Only fetch property bookings
    const { status } = req.query; // Optional status filter

    if (status) query.status = status; // Apply status filter if provided

    const bookings = await Booking.find(query)
      .populate({
        path: "property_id",
        populate: [
          { path: "owner_id", select: "full_name email profile_picture" }, // Owner details
          { path: "property_type", select: "name" }, // Property type
          {
            path: "location",
            select:
              "address city state country postal_code latitude longitude nearbyPlaces",
          }, // Full location details
          { path: "media", select: "images videos" }, // Property media (images & videos)
          { path: "feature_details", select: "feature_name description" }, // Property features
        ],
      })
      .lean()
      .populate({
        path: "user_id",
        select: "full_name email profile_picture", // User details
      });

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No property bookings found matching the criteria" });
    }

    // Fetch property reviews and attach them to respective properties
    const bookingsWithReviews = await Promise.all(
      bookings.map(async (booking) => {
        let propertyReviews = [];
        if (booking.property_id) {
          propertyReviews = await Review.find({
            review_for: booking.property_id._id,
            review_for_type: "Property",
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
          property_id: {
            ...booking.property_id,
            reviews: propertyReviews, // Add reviews to property
          },
        };
      })
    );

    res.status(200).json({
      message: "Property bookings retrieved successfully",
      bookings: bookingsWithReviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Get Booking by Booking ID
exports.getPropertyBookingById = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const booking = await Booking.findById(booking_id)
      .populate({
        path: "property_id",
        populate: [
          { path: "owner_id", select: "full_name email profile_picture" }, // Owner details
          { path: "property_type", select: "name" }, // Property type
          {
            path: "location",
            select:
              "address city state country postal_code latitude longitude nearbyPlaces",
          }, // Full location details
          { path: "media", select: "images videos" }, // Property media
          { path: "feature_details", select: "feature_name description" }, // Property features
        ],
      })
      .lean()
      .populate({
        path: "user_id",
        select: "full_name email profile_picture", // User details
      });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Fetch property reviews
    let propertyReviews = [];
    if (booking.property_id) {
      propertyReviews = await Review.find({
        review_for: booking.property_id._id,
        review_for_type: "Property",
      })
        .populate({
          path: "review_by",
          select: "full_name email profile_picture",
        }) // Reviewer details
        .select("review_description review_rating createdAt")
        .lean();
    }

    // Construct final response
    const bookingWithReviews = {
      ...booking,
      property_id: {
        ...booking.property_id,
        reviews: propertyReviews, // Attach reviews to property details
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

// ✅ Get All Bookings for a Specific Property with Optional Status Filter
exports.getBookingsByEntitiesId = async (req, res) => {
  try {
    const { property_id, status, user_id, realtor_id } = req.query; // Query parameters

    let query = { booking_type: "property" };

    if (property_id) query.property_id = property_id; // Filter by property ID if provided
    if (status) query.status = status; // Filter by status if provided
    if (user_id) query.user_id = user_id; // Filter by user ID if provided
    if (realtor_id) query.realtor_id = realtor_id; // Filter

    const bookings = await Booking.find(query)
      .populate({
        path: "property_id",
        populate: [
          { path: "owner_id", select: "full_name email profile_picture" }, // Owner details
          { path: "property_type", select: "name" }, // Property type
          {
            path: "location",
            select:
              "address city state country postal_code latitude longitude nearbyPlaces",
          }, // Full location details
          { path: "media", select: "images videos" }, // Property media
          { path: "feature_details", select: "feature_name description" }, // Property features
        ],
      })
      .lean()
      .populate({
        path: "user_id",
        select: "full_name email profile_picture", // User details
      });

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found matching the criteria" });
    }

    // Fetch property reviews for each booking
    const bookingsWithReviews = await Promise.all(
      bookings.map(async (booking) => {
        let propertyReviews = [];
        if (booking.property_id) {
          propertyReviews = await Review.find({
            review_for: booking.property_id._id,
            review_for_type: "Property",
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
          property_id: {
            ...booking.property_id,
            reviews: propertyReviews, // Attach reviews to property details
          },
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

exports.getBookedPropertyDetails = async (req, res) => {
  try {
    const { property_id } = req.params;

    // Find bookings with status 'active' or 'confirmed'
    const bookings = await Booking.find({
      property_id,
      status: { $in: ["active", "confirmed"] },
    });

    // Enrich each booking with owner's name based on owner_type
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        let ownerName = null;

        if (booking.owner_type === "User") {
          const user = await User.findById(booking.owner_id).select(
            "full_name"
          );
          ownerName = user?.full_name || null;
        } else if (booking.owner_type === "Admin") {
          const admin = await Admin.findById(booking.owner_id).select("name");
          ownerName = admin?.name || null;
        }

        // Add owner_name field to booking object
        return {
          ...booking.toObject(),
          owner_name: ownerName,
        };
      })
    );

    res.status(200).json(enrichedBookings);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getSlots = async (req, res) => {
  try {
    const { property_id, date } = req.query;

    // Validate input
    if (!property_id || !date) {
      return res.status(400).json({ message: "Property ID and date are required" });
    }

    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Find property
    const property = await Property.findById(property_id)
      .select('charge_per unavailable_slots');
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (property.charge_per !== "per_hour") {
      return res.status(400).json({ message: "Only Hourly booking supported" });
    }

    // Set date boundaries
    const startOfDay = new Date(selectedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Get all blocked periods
    const [bookings, unavailableSlots] = await Promise.all([
      Booking.find({
        property_id,
        status: { $in: ["active", "confirmed", "pending"] },
        start_date: { $gte: startOfDay, $lt: endOfDay }
      }).select("slots"),
      
      (property.unavailable_slots || []).filter(slot => {
        const slotStart = new Date(slot.start_date);
        const slotEnd = new Date(slot.end_date);
        return slotStart <= endOfDay && slotEnd >= startOfDay;
      })
    ]);

    // Generate ALL 24 hourly slots
    const allSlots = Array.from({ length: 24 }, (_, hour) => {
      const startHour = hour % 12 || 12;
      const endHour = (hour + 1) % 12 || 12;
      const period = hour < 12 ? 'AM' : 'PM';
      const nextPeriod = (hour + 1) < 12 ? 'AM' : 'PM';
      
      return {
        start_time: `${startHour}:00 ${period}`,
        end_time: `${endHour}:00 ${nextPeriod}`
      };
    });

    // Convert time to minutes (0-1439)
    const timeToMinutes = timeStr => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      return (hours % 12 + (period === 'PM' ? 12 : 0)) * 60 + minutes;
    };

    // Check if slot is blocked
    const isBlocked = (slotStart, slotEnd) => {
      // Check unavailable slots first
      for (const slot of unavailableSlots) {
        const blockStart = timeToMinutes(slot.start_time);
        const blockEnd = timeToMinutes(slot.end_time);
        
        if (slotStart < blockEnd && slotEnd > blockStart) {
          return true;
        }
      }

      // Check bookings
      for (const booking of bookings) {
        for (const bookedSlot of booking.slots) {
          const bookedStart = timeToMinutes(bookedSlot.start_time);
          const bookedEnd = timeToMinutes(bookedSlot.end_time);
          
          if (slotStart < bookedEnd && slotEnd > bookedStart) {
            return true;
          }
        }
      }

      return false;
    };

    // Filter available slots
    const availableSlots = allSlots.filter(slot => {
      const slotStart = timeToMinutes(slot.start_time);
      const slotEnd = timeToMinutes(slot.end_time);
      
      // Handle overnight slot (11PM-12AM)
      if (slotEnd < slotStart) {
        return !isBlocked(slotStart, 1440) && !isBlocked(0, slotEnd);
      }
      
      return !isBlocked(slotStart, slotEnd);
    });

    res.status(200).json({
      message: "Slots fetched successfully",
      available_slots: availableSlots,
      booked_slots: bookings.flatMap(b => b.slots),
      unavailable_slots: unavailableSlots.map(s => ({
        start_time: s.start_time,
        end_time: s.end_time
      })),
      date: date
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
