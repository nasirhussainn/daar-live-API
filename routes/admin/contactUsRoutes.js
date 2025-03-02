const express = require("express");
const router = express.Router();
const contactUsController = require("../../controller/admin/contactUsController");

// Route to submit a contact form
router.post("/submit", contactUsController.submitContactForm);

// Route to get all messages (Admin only)
router.get("/all", contactUsController.getAllMessages);

// Route to get a specific message by ID
router.get("/:id", contactUsController.getMessageById);

// Route to delete a message by ID (Admin only)
router.delete("/:id", contactUsController.deleteMessage);

module.exports = router;
