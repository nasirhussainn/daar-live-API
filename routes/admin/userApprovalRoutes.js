const express = require("express");
const {
  updateUserStatus,
} = require("../../controller/admin/userApprovalController");

const router = express.Router();

// Route to update user status
router.put("/user/:userId", updateUserStatus);

module.exports = router;
