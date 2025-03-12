const express = require("express");
const { getRealtorStats } = require("./getRealtorStats");

// Route to fetch stats for a specific realtor
exports.getRealtorStats =  ("/:realtorId", async (req, res) => {
  try {
    const realtorId = req.params.realtorId;

    if (!realtorId) {
      return res.status(400).json({ success: false, message: "Realtor ID is required" });
    }

    const stats = await getRealtorStats(realtorId);

    if (!stats) {
      return res.status(404).json({ success: false, message: "Realtor stats not found" });
    }

    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching realtor stats:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

