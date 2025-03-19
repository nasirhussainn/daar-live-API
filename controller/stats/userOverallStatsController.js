const express = require("express");
const { getTotalRevenue } = require("./getTotalRevenue");

// Route to fetch stats for a specific realtor
exports.getTotalRevenue =  ("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const stats = await getTotalRevenue(userId);

    if (!stats) {
      return res.status(404).json({ success: false, message: "User stats not found" });
    }

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

