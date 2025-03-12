const express = require("express");
const { getRealtorStats } = require("../../controller/stats/realtorStatsController");
const { getHostsStats } = require("../../controller/stats/hostStatsController");

const router = express.Router();

// Route to fetch realtor stats
router.get("/realtor/:realtorId", getRealtorStats);
router.get("/host/:hostId", getHostsStats);

module.exports = router;
