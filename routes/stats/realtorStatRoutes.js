const express = require("express");
const { getRealtorStats } = require("../../controller/stats/realtorStatController");

const router = express.Router();

// Route to fetch realtor stats
router.get("/stats/:realtorId", getRealtorStats);

module.exports = router;
