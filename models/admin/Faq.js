const mongoose = require("mongoose");

const FaqSchema = new mongoose.Schema(
  {
    question: { type: Map, of: String, required: true, unique: true },
    answer: { type: Map, of: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Faq", FaqSchema);
