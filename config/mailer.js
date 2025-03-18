const nodemailer = require("nodemailer");
const Booking = require("../models/Booking");
const User = require("../models/User");
const Property = require("../models/Properties");
const Event = require("../models/Events");
const Admin = require("../models/Admin");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

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
    if (booking.owner_type === "Admin") {
      realtor = await Admin.findById(booking.owner_id);
      realtor.full_name = "Admin"
    } else {
      realtor = await User.findById(booking.owner_id);
    }
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
        <li><strong>Location:</strong> ${property.city}, ${property.state}, ${
      property.country
    }</li>
        <li><strong>Booking Start Date:</strong> ${new Date(
          booking.start_date
        ).toLocaleDateString()}</li>
        <li><strong>Booking End Date:</strong> ${new Date(
          booking.end_date
        ).toLocaleDateString()}</li>
        <li><strong>Security Deposit:</strong> $${
          booking.security_deposit || "N/A"
        }</li>
        <li><strong>Confirmation Ticket:</strong> ${
          booking.confirmation_ticket
        }</li>
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
    const event = await Event.findById(booking.event_id).populate("location");
    if (!event) throw new Error("Event not found");

    // Fetch host (event organizer) details
    if (booking.owner_type === "Admin") {
      host = await Admin.findById(booking.owner_id);
      host.full_name = "Admin"
    } else {
      host = await User.findById(booking.owner_id);
    }
    if (!host) throw new Error("Host not found");

    // Generate email content
    const emailSubject = "Event Booking Confirmation - Your Ticket Details";

    let ticketDetailsHTML = "";
    booking.tickets.forEach((ticket, index) => {
      ticketDetailsHTML += `<li><strong>Ticket ${index + 1}:</strong> ${
        ticket.ticket_id
      }</li>`;
    });

    const emailBody = `
      <p>Dear ${buyer.full_name},</p>
      <p>Your booking for the event <strong>${
        event.title
      }</strong> has been successfully confirmed.</p>
      <p><strong>Event Details:</strong></p>
      <ul>
        <li><strong>Event:</strong> ${event.title}</li>
        <li><strong>Date:</strong> ${new Date(
          event.start_date
        ).toLocaleDateString()}</li>
        <li><strong>Location:</strong> ${event.location.address}, ${
      event.city
    }, ${event.state}</li>
        <li><strong>Number of Tickets:</strong> ${booking.tickets.length}</li>
        <li><strong>Guest Name:</strong> ${
          booking.guest_name || buyer.full_name
        }</li>
        <li><strong>Guest Email:</strong> ${
          booking.guest_email || buyer.email
        }</li>
        <li><strong>Confirmation Ticket:</strong> ${
          booking.confirmation_ticket
        }</li>
        ${ticketDetailsHTML}
      </ul>
      <p>Your tickets are attached as a PDF file.</p>
      <p>For any queries, please contact the event host:</p>
      <p><strong>Host:</strong> ${host.full_name} (${host.email})</p>
      <p>Thank you for booking with us!</p>
    `;

    try {
      // Generate a PDF with ticket details
      const pdfPath = await generateBookingPDF(booking, buyer, event);

      // Send email with PDF attachment to buyer
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: buyer.email,
        subject: emailSubject,
        html: emailBody,
        attachments: [
          {
            filename: "Event_Tickets.pdf",
            path: pdfPath,
            contentType: "application/pdf",
          },
        ],
      });

      // ✅ Delete the PDF file after sending the email
      fs.unlink(pdfPath, (err) => {
        if (err) {
          console.error("Error deleting PDF:", err);
        } else {
          console.log("PDF deleted successfully.");
        }
      });
    } catch (error) {
      console.error(
        "Error sending event booking confirmation email:",
        error.message
      );
    }

    // Send email to event host
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: host.email,
      subject: "New Event Booking Confirmation",
      html: `
        <p>Dear ${host.full_name},</p>
        <p>Your event <strong>${event.title}</strong> has been booked by <strong>${buyer.full_name}</strong>.</p>
        <p>Booking details:</p>
        ${emailBody}
        <p>Best regards,</p>
        <p>Your Platform Team</p>
      `,
    });

    console.log("Event booking confirmation emails sent successfully.");
  } catch (error) {
    console.error(
      "Error sending event booking confirmation emails:",
      error.message
    );
  }
}

/**
 * Generates a PDF file with ticket details
 */
async function generateBookingPDF(booking, buyer, event) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const filePath = path.join(__dirname, `Event_Tickets_${booking._id}.pdf`);
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Title
    doc
      .fontSize(18)
      .text("Event Booking Confirmation", { align: "center" })
      .moveDown();

    // Event details
    doc.fontSize(14).text(`Event: ${event.title}`);
    doc.text(`Date: ${new Date(event.start_date).toLocaleDateString()}`);
    doc
      .text(`Location: ${event.venue}, ${event.city}, ${event.state}`)
      .moveDown();

    // Booking details
    doc.text(`Booking ID: ${booking._id}`);
    doc.text(`Buyer: ${buyer.full_name} (${buyer.email})`);
    doc.text(`Number of Tickets: ${booking.tickets.length}`);
    doc.text(`Confirmation Ticket: ${booking.confirmation_ticket}`).moveDown();

    // Ticket list
    doc.fontSize(12).text("Ticket Details:", { underline: true }).moveDown();
    booking.tickets.forEach((ticket, index) => {
      doc.text(`Ticket ${index + 1}: ${ticket.ticket_id}`);
    });

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", (err) => reject(err));
  });
}

async function sendAccountStatusUpdateEmail(user) {
  try {
    const emailSubject = "Update on Your Account Status";
    const emailBody = `
      <p>Dear ${user.full_name},</p>
      <p>We wanted to inform you that your account status has been updated.</p>
      <p><strong>New Status:</strong> ${user.account_status.toUpperCase()}</p>
      <p>If you have any questions, please feel free to contact our support team.</p>
      <p>Best regards,</p>
      <p>Your Platform Team</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: emailSubject,
      html: emailBody,
    });
    
  } catch (error) {
    console.error("Error sending account status update email:", error.message);
  }
}

// Function to send approval/disapproval emails
async function sendPropertyStatusEmail(email, propertyTitle, status, reason = "") {
  try {
    const subject =
      status === "approved"
        ? "Your Property has been Approved"
        : "Your Property has been Disapproved";

    let message =
      status === "approved"
        ? `Congratulations! Your property "${propertyTitle}" has been approved and is now live.`
        : `Unfortunately, your property "${propertyTitle}" has been disapproved.`;

    if (status === "disapproved" && reason) {
      message += `\nReason: ${reason}`;
    }

    message += `\n\nIf you have any questions, please contact our support team.`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email} for property status: ${status}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}


module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPropertyBookingConfirmationEmail,
  sendEventBookingConfirmationEmail,
  sendAccountStatusUpdateEmail,
  sendPropertyStatusEmail
};
