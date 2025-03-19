const mongoose = require("mongoose");
const express = require("express");
const Event = require("../../models/Events");
const Booking = require("../../models/Booking");
const { getHostsStats } = require("./getHostStats");

exports.getHostStats = ("/:hostId", async (req, res) => {
  try {
    const hostId = req.params.hostId;

    if (!hostId) {
      return res.status(400).json({ success: false, message: "Host ID is required" });
    }

    const stats = await getHostsStats(hostId);

    if (!stats) {
      return res.status(404).json({ success: false, message: "Host stats not found" });
    }

    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching host stats:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

