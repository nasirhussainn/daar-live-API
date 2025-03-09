const nodemailer = require("nodemailer");
const Booking = require("../models/Booking");
const User = require("../models/User");
const Property = require("../models/Properties");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(email, verificationLink) {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Verify Your Email",
    html: `<p>Click the link below to verify your email:</p>
           <a href="${verificationLink}">${verificationLink}</a>`,
  };

  await transporter.sendMail(mailOptions);
}

async function sendPasswordResetEmail(email, resetLink) {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Password Reset Request",
    html: `<p>Click the link below to reset your password:</p>
           <a href="${resetLink}">${resetLink}</a>`,
  };

  await transporter.sendMail(mailOptions);
}


async function sendPropertyBookingConfirmationEmail(booking) {
  try {
    // Fetch buyer (user) details
    const buyer = await User.findById(booking.user_id);
    if (!buyer) throw new Error("Buyer not found");

    // Fetch realtor details
    const realtor = await User.findById(booking.realtor_id);
    if (!realtor) throw new Error("Realtor not found");

    // Fetch property details
    const property = await Property.findById(booking.property_id);
    if (!property) throw new Error("Property not found");

    // Construct email content
    const emailSubject = "Booking Confirmation - Your Booking Details";
    const emailBody = `
      <p>Dear ${buyer.full_name},</p>
      <p>Your booking has been successfully confirmed.</p>
      <p><strong>Booking Details:</strong></p>
      <ul>
        <li><strong>Property:</strong> ${property.title}</li>
        <li><strong>Location:</strong> ${property.city}, ${property.state}, ${property.country}</li>
        <li><strong>Booking Start Date:</strong> ${new Date(booking.start_date).toLocaleDateString()}</li>
        <li><strong>Booking End Date:</strong> ${new Date(booking.end_date).toLocaleDateString()}</li>
        <li><strong>Security Deposit:</strong> $${booking.security_deposit || "N/A"}</li>
        <li><strong>Confirmation Ticket:</strong> ${booking.confirmation_ticket}</li>
      </ul>
      <p>For any queries, please contact the property owner:</p>
      <p><strong>Realtor:</strong> ${realtor.full_name} (${realtor.email})</p>
      <p>Thank you for booking with us!</p>
    `;

    // Send email to buyer
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: buyer.email,
      subject: emailSubject,
      html: emailBody,
    });

    // Send email to realtor
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: realtor.email,
      subject: "New Booking Confirmation",
      html: `
        <p>Dear ${realtor.full_name},</p>
        <p>Your property <strong>${property.title}</strong> has been booked.</p>
        <p>Booking details:</p>
        ${emailBody} <!-- Reusing the same email content -->
        <p>Best regards,</p>
        <p>Your Platform Team</p>
      `,
    });

    console.log("Booking confirmation emails sent successfully.");
  } catch (error) {
    console.error("Error sending booking confirmation emails:", error.message);
  }
}


async function sendEventBookingConfirmationEmail(booking) {
  try {
    // Fetch buyer (user) details
    const buyer = await User.findById(booking.user_id);
    if (!buyer) throw new Error("Buyer not found");

    // Fetch event details
    const event = await Event.findById(booking.event_id);
    if (!event) throw new Error("Event not found");

    // Fetch host (event organizer) details
    const host = await User.findById(event.host_id);
    if (!host) throw new Error("Event host not found");

    // Generate email content
    const emailSubject = "Event Booking Confirmation - Your Ticket Details";
    const emailBody = `
      <p>Dear ${buyer.full_name},</p>
      <p>Your booking for the event <strong>${event.title}</strong> has been successfully confirmed.</p>
      <p><strong>Event Details:</strong></p>
      <ul>
        <li><strong>Event:</strong> ${event.title}</li>
        <li><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${event.time}</li>
        <li><strong>Location:</strong> ${event.venue}, ${event.city}, ${event.state}</li>
        <li><strong>Number of Tickets:</strong> ${booking.number_of_tickets}</li>
        <li><strong>Guest Name:</strong> ${booking.guest_name || buyer.full_name}</li>
        <li><strong>Guest Email:</strong> ${booking.guest_email || buyer.email}</li>
        <li><strong>Confirmation Ticket:</strong> ${booking.confirmation_ticket}</li>
      </ul>
      <p>For any queries, please contact the event host:</p>
      <p><strong>Host:</strong> ${host.full_name} (${host.email})</p>
      <p>Thank you for booking with us!</p>
    `;

    // Send email to buyer
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: buyer.email,
      subject: emailSubject,
      html: emailBody,
    });

    // Send email to event host
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: host.email,
      subject: "New Event Booking Confirmation",
      html: `
        <p>Dear ${host.full_name},</p>
        <p>Your event <strong>${event.title}</strong> has been booked by <strong>${buyer.full_name}</strong>.</p>
        <p>Booking details:</p>
        ${emailBody} <!-- Reusing the same email content -->
        <p>Best regards,</p>
        <p>Your Platform Team</p>
      `,
    });

    console.log("Event booking confirmation emails sent successfully.");
  } catch (error) {
    console.error("Error sending event booking confirmation emails:", error.message);
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendPropertyBookingConfirmationEmail, sendEventBookingConfirmationEmail };
