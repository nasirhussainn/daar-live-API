const mongoose = require("mongoose");

const AboutSchema = new mongoose.Schema(
  {
    heading: { type: Map, of: String, required: true, unique: true },
    paragraph: { type: Map, of: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("About", AboutSchema);
