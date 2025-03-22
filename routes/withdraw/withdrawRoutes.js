const express = require("express");
const router = express.Router();
const withdrawController = require("../../controller/withdraw/withdrawController");

// User requests a withdrawal
router.post("/request", withdrawController.requestWithdraw);

// withdraw request by it id
router.get("/:withdraw_id", withdrawController.getWithdrawRequestById);

// update withdraw request by user
router.put("/:withdraw_id", withdrawController.updateWithdrawRequest);

// Admin fetches all withdrawal requests
router.get("/all", withdrawController.getAllWithdrawals);

// Get withdrawal requests for a specific user
router.get("/user/:user_id", withdrawController.getUserWithdrawals);

// Admin approves or rejects a withdrawal
router.put("/:id/status", withdrawController.updateWithdrawStatus);

// Admin deletes a withdrawal request
router.delete("/:id", withdrawController.deleteWithdraw);

module.exports = router;
