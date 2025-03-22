const ContactUs = require("../../models/admin/ContactUs");
const { forwardContactMessageToAdmin } = require("../../config/mailer");

// Handle contact form submission
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Create new contact message
    const newMessage = new ContactUs({ name, email, subject, message });
    await newMessage.save();
    // Forward the message to the admin email
    await forwardContactMessageToAdmin(name, email, subject, message);
    res
      .status(201)
      .json({ message: "Message sent successfully", data: newMessage });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    res
      .status(500)
      .json({ message: "Error submitting message", error: error.message });
  }
};

// Get all contact messages (admin use)
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await ContactUs.find().sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res
      .status(500)
      .json({ message: "Error fetching messages", error: error.message });
  }
};

// Get a single message by ID
exports.getMessageById = async (req, res) => {
  try {
    const message = await ContactUs.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    res.status(200).json(message);
  } catch (error) {
    console.error("Error fetching message:", error);
    res
      .status(500)
      .json({ message: "Error fetching message", error: error.message });
  }
};

// Delete a message (admin use)
exports.deleteMessage = async (req, res) => {
  try {
    const deletedMessage = await ContactUs.findByIdAndDelete(req.params.id);
    if (!deletedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }
    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res
      .status(500)
      .json({ message: "Error deleting message", error: error.message });
  }
};
