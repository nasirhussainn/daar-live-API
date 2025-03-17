const express = require("express");
const router = express.Router();
const paymentHistoryController = require("../../controller/payment/paymentHistoryController");

// Routes
router.get("/", paymentHistoryController.getAllPayments);
router.get("/:user_id", paymentHistoryController.getPaymentsByUser);

module.exports = router;
