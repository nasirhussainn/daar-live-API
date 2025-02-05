// mailer.js
const nodemailer = require("nodemailer");
require("dotenv").config(); // Load environment variables from .env file

// Configure the email transporter using environment variables
const transporter = nodemailer.createTransport({
  service: "gmail", // Change to the desired service if needed
  auth: {
    user: process.env.EMAIL_USER, // Use the email from the .env file
    pass: process.env.EMAIL_PASS, // Use the password from the .env file
  },
});

/**
 * Send an email
 * @param {string} to - The recipient email address
 * @param {string} subject - The subject of the email
 * @param {string} text - The body of the email
 * @returns {Promise<void>}
 */
const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Use the email from the .env file
    to, // Recipient email
    subject, // Email subject
    text, // Email body text
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

// Export sendEmail function for use in other files
module.exports = sendEmail;
