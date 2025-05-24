const express = require("express");
const {
  getTopSubscriptions,
  getPaidUsers,
} = require("../../controller/stats/subscriptionStatController");

const router = express.Router();

router.get("/subscriptions/top", getTopSubscriptions);
router.get("/subscriptions/paid-users", getPaidUsers);

module.exports = router;
