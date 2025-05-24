const nodemailer = require("nodemailer");
const Booking = require("../models/Booking");
const User = require("../models/User");
const Property = require("../models/Properties");
const Event = require("../models/Events");
const Admin = require("../models/Admin");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const Withdraw = require("../models/Withdraw");
const Settings = require("../models/admin/Settings");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
}

async function sendVerificationEmail(email, verificationLink) {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Verify Your Email Address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #333;">Welcome to Daar Live!</h2>
        <p style="font-size: 16px; color: #555;">
          Thank you for signing up. Please verify your email address by clicking the button below:
        </p>
        <a href="${verificationLink}" style="display: inline-block; padding: 12px 20px; margin-top: 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p style="font-size: 14px; color: #999; margin-top: 30px;">
          If the button above doesn’t work, you can also verify by clicking this link:<br/>
          <a href="${verificationLink}" style="color: #007bff;">${verificationLink}</a>
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

async function sendPasswordResetEmail(email, resetLink) {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="font-size: 16px; color: #555;">
          We received a request to reset your password. Click the button below to proceed:
        </p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 20px; margin-top: 20px; background-color: #dc3545; color: #fff; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p style="font-size: 14px; color: #999; margin-top: 30px;">
          If you didn’t request this, please ignore this email.<br/>
          Or use this link if the button doesn't work:<br/>
          <a href="${resetLink}" style="color: #dc3545;">${resetLink}</a>
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

async function sendPropertyBookingConfirmationEmail(booking) {
  try {
    // Fetch buyer (user) details
    const buyer = await User.findById(booking.user_id);
    if (!buyer) throw new Error("Buyer not found");

    // Fetch realtor details
    let realtor;
    if (booking.owner_type === "Admin") {
      realtor = await Admin.findById(booking.owner_id);
      realtor.full_name = "Admin";
    } else {
      realtor = await User.findById(booking.owner_id);
    }
    if (!realtor) throw new Error("Realtor not found");

    // Fetch property details
    const property = await Property.findById(booking.property_id);
    if (!property) throw new Error("Property not found");

    // Construct email content for buyer
    const emailSubject = "Booking Confirmation - Your Booking Details";
    const emailBody = `
      <p>Dear ${buyer.full_name},</p>
      <p>Your booking has been successfully confirmed.</p>
      <p><strong>Booking Details:</strong></p>
      <ul>
        <li><strong>Property:</strong> ${property.title.get("en")}</li>
        <li><strong>Location:</strong> ${property.city.get("en")}, ${property.state.get("en")}, ${property.country.get("en")}</li>
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
        <p>Your property <strong>${property.title.get("en")}</strong> has been booked.</p>
        <p>Booking details:</p>
        ${emailBody} <!-- Reusing the same email content -->
        <p>Best regards,</p>
        <p>Daar Live</p>
      `,
    });

    // If the owner is not Admin, send an email to Admin as well
    if (booking.owner_type !== "Admin") {
      const admin = await Admin.findOne(); // Assuming there's only one Admin or fetching the relevant Admin
      if (admin) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: admin.email,
          subject: `New Booking for Property: ${property.title.get("en")}`,
          html: `
            <p>Dear Admin,</p>
            <p>A new booking has been made for the property <strong>${property.title.get("en")}</strong>.</p>
            <p>Booking details:</p>
            ${emailBody} <!-- Reusing the same email content -->
            <p>Best regards,</p>
            <p>Daar Live</p>
          `,
        });
      } else {
        console.error(
          "Admin not found. Booking confirmation email not sent to Admin.",
        );
      }
    }

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
    let host;
    if (booking.owner_type === "Admin") {
      host = await Admin.findById(booking.owner_id);
      host.full_name = "Admin";
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
      <p>Your booking for the event <strong>${event.title.get("en")}</strong> has been successfully confirmed.</p>
      <p><strong>Event Details:</strong></p>
      <ul>
        <li><strong>Event:</strong> ${event.title.get("en")}</li>
        <li><strong>Date:</strong> ${new Date(event.start_date).toLocaleDateString()}</li>
        <li><strong>Location:</strong> ${event.location.address}, ${event.city.get(
          "en",
        )}, ${event.state.get("en")}</li>
        <li><strong>Number of Tickets:</strong> ${booking.tickets.length}</li>
        <li><strong>Guest Name:</strong> ${booking.guest_name || buyer.full_name}</li>
        <li><strong>Guest Email:</strong> ${booking.guest_email || buyer.email}</li>
        <li><strong>Confirmation Ticket:</strong> ${booking.confirmation_ticket}</li>
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
        error.message,
      );
    }

    // Send email to event host
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: host.email,
      subject: "New Event Booking Confirmation",
      html: `
        <p>Dear ${host.full_name},</p>
        <p>Your event <strong>${event.title.get("en")}</strong> has been booked by <strong>${buyer.full_name}</strong>.</p>
        <p>Booking details:</p>
        ${emailBody}
        <p>Best regards,</p>
        <p>Daar Live</p>
      `,
    });

    // If the owner is not Admin, send an email to Admin as well
    if (booking.owner_type !== "Admin") {
      const admin = await Admin.findOne(); // Assuming there's only one Admin or fetching the relevant Admin
      if (admin) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: admin.email,
          subject: `New Booking for Event: ${event.title.get("en")}`,
          html: `
            <p>Dear Admin,</p>
            <p>A new booking has been made for the event <strong>${event.title.get("en")}</strong>.</p>
            <p>Booking details:</p>
            ${emailBody} <!-- Reusing the same email content -->
            <p>Best regards,</p>
            <p>Daar Live</p>
          `,
        });
      } else {
        console.error(
          "Admin not found. Booking confirmation email not sent to Admin.",
        );
      }
    }

    console.log("Event booking confirmation emails sent successfully.");
  } catch (error) {
    console.error(
      "Error sending event booking confirmation emails:",
      error.message,
    );
  }
}

async function sendPropertyBookingCancellationEmail(booking) {
  try {
    // Fetch buyer (user) details
    const buyer = await User.findById(booking.user_id);
    if (!buyer) throw new Error("Buyer not found");

    // Fetch property details
    const property = await Property.findById(booking.property_id);
    if (!property) throw new Error("Property not found");

    // Determine realtor (owner)
    let realtor;
    let isOwnerAdmin = false;
    if (booking.owner_type === "Admin") {
      realtor = await Admin.findById(booking.owner_id);
      if (realtor) realtor.full_name = "Admin";
      isOwnerAdmin = true;
    } else {
      realtor = await User.findById(booking.owner_id);
    }
    if (!realtor) throw new Error("Realtor not found");

    // Construct email content
    const buyerEmailSubject = "Booking Cancellation - Important Update";
    const buyerEmailBody = `
      <p>Dear ${buyer.full_name},</p>
      <p>We regret to inform you that your booking has been canceled.</p>
      <p><strong>Booking Details:</strong></p>
      <ul>
        <li><strong>Property:</strong> ${property.title.get("en")}</li>
        <li><strong>Location:</strong> ${property.city.get("en")}, ${property.state.get("en")}, ${property.country.get("en")}</li>
        <li><strong>Booking Start Date:</strong> ${new Date(booking.start_date).toLocaleDateString()}</li>
        <li><strong>Booking End Date:</strong> ${new Date(booking.end_date).toLocaleDateString()}</li>
        <li><strong>Security Deposit Refund:</strong> ${booking.security_deposit ? `$${booking.security_deposit}` : "N/A"}</li>
        <li><strong>Cancellation Reason:</strong> ${booking.cancelation_reason.get("en") || "Not provided"}</li>
      </ul>
      <p>For any further assistance, feel free to contact us.</p>
      <p>Thank you for choosing our service.</p>
    `;

    const realtorEmailSubject = "Booking Cancellation Notification";
    const realtorEmailBody = `
      <p>Dear ${realtor.full_name},</p>
      <p>A booking for your property has been canceled.</p>
      <p><strong>Booking Details:</strong></p>
      <ul>
        <li><strong>Property:</strong> ${property.title.get("en")}</li>
        <li><strong>Booked by:</strong> ${buyer.full_name} (${buyer.email})</li>
        <li><strong>Booking Start Date:</strong> ${new Date(booking.start_date).toLocaleDateString()}</li>
        <li><strong>Booking End Date:</strong> ${new Date(booking.end_date).toLocaleDateString()}</li>
        <li><strong>Cancellation Reason:</strong> ${booking.cancelation_reason.get("en") || "Not provided"}</li>
      </ul>
      <p>The property is now available for new bookings.</p>
      <p>Best regards,</p>
      <p>Daar Live</p>
    `;

    const adminEmailSubject = "Booking Cancellation Admin Notification";
    const adminEmailBody = `
      <p>Dear Admin,</p>
      <p>A booking has been canceled.</p>
      <p><strong>Booking Details:</strong></p>
      <ul>
        <li><strong>Property:</strong> ${property.title.get("en")}</li>
        <li><strong>Booked by:</strong> ${buyer.full_name} (${buyer.email})</li>
        <li><strong>Booking Start Date:</strong> ${new Date(booking.start_date).toLocaleDateString()}</li>
        <li><strong>Booking End Date:</strong> ${new Date(booking.end_date).toLocaleDateString()}</li>
        <li><strong>Cancellation Reason:</strong> ${booking.cancelation_reason.get("en") || "Not provided"}</li>
      </ul>
      <p>Regards,</p>
      <p>Daar Live</p>
    `;

    // Send email to Buyer
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: buyer.email,
      subject: buyerEmailSubject,
      html: buyerEmailBody,
    });

    // Send email to Realtor (owner)
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: realtor.email,
      subject: realtorEmailSubject,
      html: realtorEmailBody,
    });

    // Check if we also need to send email to Admin
    if (!isOwnerAdmin) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL, // Use your admin email from env
        subject: adminEmailSubject,
        html: adminEmailBody,
      });
    }

    console.log("Booking cancellation emails sent successfully.");
  } catch (error) {
    console.error("Error sending booking cancellation emails:", error.message);
  }
}

async function sendEventBookingCancellationEmail(booking) {
  try {
    // Fetch buyer (user) details
    const buyer = await User.findById(booking.user_id);
    if (!buyer) throw new Error("Buyer not found");

    // Fetch event details
    const event = await Event.findById(booking.event_id).populate("location");
    if (!event) throw new Error("Event not found");

    // Fetch host (event organizer) details
    let host;
    const isOwnerAdmin = booking.owner_type === "Admin";

    if (isOwnerAdmin) {
      host = await Admin.findById(booking.owner_id);
      host.full_name = "Admin";
    } else {
      host = await User.findById(booking.owner_id);
    }
    if (!host) throw new Error("Host not found");

    // Generate email content
    const emailSubject = "Event Booking Cancellation - Confirmation";

    let ticketDetailsHTML = "";
    booking.tickets.forEach((ticket, index) => {
      ticketDetailsHTML += `<li><strong>Ticket ${index + 1}:</strong> ${ticket.ticket_id}</li>`;
    });

    const emailBody = `
      <p>Dear ${buyer.full_name},</p>
      <p>We regret to inform you that your booking for the event <strong>${event.title.get("en")}</strong> has been canceled.</p>
      <p><strong>Event Details:</strong></p>
      <ul>
        <li><strong>Event:</strong> ${event.title.get("en")}</li>
        <li><strong>Date:</strong> ${new Date(event.start_date).toLocaleDateString()}</li>
        <li><strong>Location:</strong> ${event.location.address}, ${event.city.get("en")}, ${event.state.get("en")}</li>
        <li><strong>Number of Tickets Canceled:</strong> ${booking.tickets.length}</li>
        <li><strong>Guest Name:</strong> ${booking.guest_name || buyer.full_name}</li>
        <li><strong>Guest Email:</strong> ${booking.guest_email || buyer.email}</li>
        <li><strong>Cancellation Reason:</strong> ${booking.cancelation_reason.get("en") || "Not provided"}</li>
        ${ticketDetailsHTML}
      </ul>
      <p>${booking.refund_status ? "A refund will be processed as per our policy." : "Please contact support for refund-related queries."}</p>
      <p>For any further assistance, please reach out to the event host:</p>
      <p><strong>Host:</strong> ${host.full_name} (${host.email})</p>
      <p>We hope to see you at future events!</p>
    `;

    // Send cancellation email to buyer
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
      subject: "Event Booking Cancellation Notification",
      html: `
        <p>Dear ${host.full_name},</p>
        <p>We would like to inform you that a booking for your event <strong>${event.title.get("en")}</strong> has been canceled.</p>
        <p><strong>Canceled By:</strong> ${buyer.full_name} (${buyer.email})</p>
        <p><strong>Number of Tickets Canceled:</strong> ${booking.tickets.length}</p>
        <p><strong>Cancellation Reason:</strong> ${booking.cancelation_reason.get("en") || "Not provided"}</p>
        ${ticketDetailsHTML}
        <p>Best regards,</p>
        <p>Daar Live</p>
      `,
    });

    // Send email to Admin ONLY IF owner is NOT Admin
    if (!isOwnerAdmin) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: "Event Booking Cancellation - Admin Notification",
        html: `
          <p>Dear Admin,</p>
          <p>A booking for the event <strong>${event.title.get("en")}</strong> has been canceled.</p>
          <p><strong>Buyer:</strong> ${buyer.full_name} (${buyer.email})</p>
          <p><strong>Host:</strong> ${host.full_name} (${host.email})</p>
          <p><strong>Number of Tickets Canceled:</strong> ${booking.tickets.length}</p>
          <p><strong>Cancellation Reason:</strong> ${booking.cancelation_reason.get("en") || "Not provided"}</p>
          ${ticketDetailsHTML}
          <p>Best regards,</p>
          <p>Daar Live System</p>
        `,
      });
    }

    console.log("Event booking cancellation emails sent successfully.");
  } catch (error) {
    console.error(
      "Error sending event booking cancellation emails:",
      error.message,
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
    doc.fontSize(14).text(`Event: ${event.title.get("en")}`);
    doc.text(`Date: ${new Date(event.start_date).toLocaleDateString()}`);
    doc
      .text(
        `Location: ${event.venue}, ${event.city.get("en")}, ${event.state.get("en")}`,
      )
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
      <p>Daar Live</p>
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
async function sendPropertyStatusEmail(
  email,
  propertyTitle,
  status,
  reason = "",
) {
  console.log(propertyTitle);
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

// Function to notify Realtor and Admin about withdrawal request
async function sendWithdrawalRequestEmail(withdrawRequest, realtor) {
  try {
    const admin = await Admin.findOne({ role: "super" }); // Fetch admin details
    if (!admin) throw new Error("Admin not found");

    // Email to Realtor
    const realtorSubject = "Withdrawal Request Submitted";
    const realtorHtml = `
      <p>Dear ${realtor.full_name},</p>
      <p>Your withdrawal request of <strong>$${withdrawRequest.amount}</strong> has been submitted successfully.</p>
      <p><strong>Request Details:</strong></p>
      <ul>
        <li><strong>Amount:</strong> $${withdrawRequest.amount}</li>
        <li><strong>Bank Details:</strong>
          <ul>
            <li><strong>Account Holder:</strong> ${withdrawRequest.bank_details.account_holder_name}</li>
            <li><strong>Bank Name:</strong> ${withdrawRequest.bank_details.bank_name}</li>
            <li><strong>Account Number:</strong> ${withdrawRequest.bank_details.account_number}</li>
            <li><strong>Branch Name:</strong> ${withdrawRequest.bank_details.branch_name}</li>
          </ul>
        </li>
        <li><strong>Status:</strong> ${withdrawRequest.status}</li>
      </ul>

      <p>You will be notified once the request is processed.</p>
      <p>Best regards,</p>
      <p>Daar Live</p>
    `;
    await sendEmail(realtor.email, realtorSubject, realtorHtml);

    // Email to Admin
    const adminSubject = "New Withdrawal Request";
    const adminHtml = `
      <p>Dear Admin,</p>
      <p>A new withdrawal request has been submitted by <strong>${realtor.full_name}</strong>.</p>
      <p><strong>Request Details:</strong></p>
      <ul>
        <li><strong>Realtor:</strong> ${realtor.full_name} (${realtor.email})</li>
        <li><strong>Amount:</strong> $${withdrawRequest.amount}</li>
        <li><strong>Bank Details:</strong>
          <ul>
            <li><strong>Account Holder:</strong> ${withdrawRequest.bank_details.account_holder_name}</li>
            <li><strong>Bank Name:</strong> ${withdrawRequest.bank_details.bank_name}</li>
            <li><strong>Account Number:</strong> ${withdrawRequest.bank_details.account_number}</li>
            <li><strong>Branch Name:</strong> ${withdrawRequest.bank_details.branch_name}</li>
          </ul>
        </li>
        <li><strong>Status:</strong> ${withdrawRequest.status}</li>
      </ul>

      <p>Please review and update the status accordingly.</p>
      <p>Best regards,</p>
      <p>Daar Live</p>
    `;
    await sendEmail(admin.email, adminSubject, adminHtml);
  } catch (error) {
    console.error(
      "Error sending withdrawal request notification emails:",
      error,
    );
  }
}

// Function to notify Realtor about withdrawal status update
async function sendWithdrawalStatusUpdateEmail(withdrawRequest, realtor) {
  try {
    const status = withdrawRequest.status;
    const subject = `Withdrawal Request ${
      status.charAt(0).toUpperCase() + status.slice(1)
    }`;
    const html = `
      <p>Dear ${realtor.full_name},</p>
      <p>Your withdrawal request of <strong>$${withdrawRequest.amount}</strong> has been <strong>${status}</strong>.</p>
      <p><strong>Request Details:</strong></p>
      <ul>
        <li><strong>Amount:</strong> $${withdrawRequest.amount}</li>
        <li><strong>Bank Details:</strong>
          <ul>
            <li><strong>Account Holder:</strong> ${withdrawRequest.bank_details.account_holder_name}</li>
            <li><strong>Bank Name:</strong> ${withdrawRequest.bank_details.bank_name}</li>
            <li><strong>Account Number:</strong> ${withdrawRequest.bank_details.account_number}</li>
            <li><strong>Branch Name:</strong> ${withdrawRequest.bank_details.branch_name}</li>
          </ul>
        </li>
        <li><strong>Status:</strong> ${withdrawRequest.status}</li>
      </ul>

      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,</p>
      <p>Daar Live</p>
    `;
    await sendEmail(realtor.email, subject, html);
  } catch (error) {
    console.error("Error sending withdrawal status update email:", error);
  }
}

async function forwardContactMessageToAdmin(name, email, subject, message) {
  try {
    const setting = await Settings.findOne().select("contact_email -_id");
    const admin_email = setting ? setting.contact_email : null;
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender email
      to: admin_email, // Admin email
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <p>You have received a new contact form submission:</p>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Subject:</strong> ${subject}</li>
          <li><strong>Message:</strong> ${message}</li>
        </ul>
        <p>Please respond to the sender at the earliest convenience.</p>
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log("Contact form submission forwarded to admin successfully.");
  } catch (error) {
    console.error("Error forwarding contact form submission to admin:", error);
    throw error; // Re-throw the error to handle it in the main function
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPropertyBookingConfirmationEmail,
  sendPropertyBookingCancellationEmail,
  sendEventBookingConfirmationEmail,
  sendEventBookingCancellationEmail,
  sendAccountStatusUpdateEmail,
  sendPropertyStatusEmail,
  sendWithdrawalRequestEmail,
  sendWithdrawalStatusUpdateEmail,
  forwardContactMessageToAdmin,
};
