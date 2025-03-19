const express = require("express");
const { getRealtorStats } = require("../../controller/stats/realtorStatsController");
const { getHostStats } = require("../../controller/stats/hostStatsController");
const { getTotalRevenue } = require("../../controller/stats/userOverallStatsController");

const router = express.Router();

// Route to fetch realtor stats
router.get("/realtor/:realtorId", getRealtorStats);
router.get("/host/:hostId", getHostStats);
router.get("/seller/:userId", getTotalRevenue);

module.exports = router;
