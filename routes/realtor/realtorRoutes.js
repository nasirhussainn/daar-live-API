const express = require("express");
const router = express.Router();
const realtorController = require("../../controller/realtor/realtorController");

// Add or update bank details
router.post("/bank-details", realtorController.addOrUpdateBankDetails);

// Get bank details by user ID
router.get("/bank-details/:user_id", realtorController.getBankDetailsByUserId);

// Delete bank details by user ID
router.delete("/bank-details/:user_id", realtorController.deleteBankDetailsByUserId);

// Get all realtors' bank details
router.get("/all-bank-details", realtorController.getAllBankDetails);

module.exports = router;
