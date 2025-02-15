const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  is_active: {
    type: Boolean,
    default: true, // By default, subtypes are also active
  }
}, { timestamps: true });

module.exports = mongoose.model("EventType", EventSchema);
