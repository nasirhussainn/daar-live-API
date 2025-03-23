const express = require("express");
const router = express.Router();
const realtorController = require("../../controller/realtor/realtorController");

// Add or update bank details
router.post("/bank-details", realtorController.addBankDetails);
router.put("/update-bank-details", realtorController.updateBankDetails);
// Get bank details by user ID
router.get("/bank-details-viaUserId/:user_id", realtorController.getBankDetailsByUserId);
router.get("/bank-details-viaBankId/:bank_id", realtorController.getBankDetailsById);

// Delete bank details by user ID
router.delete("/bank-details/:user_id", realtorController.deleteBankDetailsByUserId);

// Get all realtors' bank details
router.get("/all-bank-details", realtorController.getAllBankDetails);

module.exports = router;
