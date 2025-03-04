const express = require("express");
const approvalController = require("../../controller/admin/approvalController");

const router = express.Router();

router.put("/property/:id", approvalController.approveProperty);

module.exports = router;
