const Realtor = require("../../models/Realtor"); // Import Realtor model

// 1. Add or Update Bank Details
exports.addOrUpdateBankDetails = async (req, res) => {
  try {
    const { user_id, account_holder_name, bank_name, account_number } = req.body;

    if (!user_id || !account_holder_name || !bank_name || !account_number ) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const realtor = await Realtor.findOneAndUpdate(
      { user_id }, // Find realtor by user_id
      { 
        bank_details: { account_holder_name, bank_name, account_number }
      },
      { new: true, upsert: true } // Create new if doesn't exist
    );

    res.status(200).json({ message: "Bank details updated successfully", data: realtor });
  } catch (error) {
    console.error("Error updating bank details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 2. Get Bank Details by User ID
exports.getBankDetailsByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const realtor = await Realtor.findOne({ user_id }).select("bank_details");

    if (!realtor || !realtor.bank_details) {
      return res.status(404).json({ message: "Bank details not found" });
    }

    res.status(200).json(realtor.bank_details);
  } catch (error) {
    console.error("Error fetching bank details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 3. Delete Bank Details by User ID
exports.deleteBankDetailsByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const realtor = await Realtor.findOneAndUpdate(
      { user_id },
      { $unset: { bank_details: "" } }, // Remove bank details
      { new: true }
    );

    if (!realtor) {
      return res.status(404).json({ message: "Realtor not found" });
    }

    res.status(200).json({ message: "Bank details deleted successfully" });
  } catch (error) {
    console.error("Error deleting bank details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 4. Get All Realtors' Bank Details
exports.getAllBankDetails = async (req, res) => {
  try {
    const realtors = await Realtor.find({ "bank_details.account_holder_name": { $exists: true } })
      .select("user_id bank_details");

    res.status(200).json(realtors);
  } catch (error) {
    console.error("Error fetching all bank details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
