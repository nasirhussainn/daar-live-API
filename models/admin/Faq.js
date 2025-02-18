const mongoose = require('mongoose');

const FaqSchema = new mongoose.Schema({
  question: { type: String, required: true, unique: true },
  answer: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Faq', FaqSchema);
