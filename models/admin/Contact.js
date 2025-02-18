const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Contact', ContactSchema);
