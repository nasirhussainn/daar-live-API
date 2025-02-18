const mongoose = require('mongoose');

const AboutSchema = new mongoose.Schema({
  heading: { type: String, required: true, unique: true },
  paragraph: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('About', AboutSchema);
