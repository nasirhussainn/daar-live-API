const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema(
  {
    title: { type: Map, of: String, required: true, unique: true },
    description: { type: Map, of: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Contact", ContactSchema);
