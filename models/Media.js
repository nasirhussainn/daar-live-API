const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Import Property and Event models for referencing
const Property = require("./Properties");
const Event = require("./Events");

// Define the Media schema
const MediaSchema = new Schema({
  images: { type: [String], required: true },
  videos: { type: [String], required: false },
  created_at: { type: Date, default: Date.now },
});

// Create Media model
const Media = mongoose.model("Media", MediaSchema);
module.exports = Media;
