const express = require("express");
const analyticsRoutes = require("../../controller/analytics/analyticsController");

const router = express.Router();

router.get("/", analyticsRoutes.getAnalytics);

module.exports = router;
