const Realtor = require("../../models/Realtor"); // Import Realtor model
const mongoose = require("mongoose"); // Import mongoose library

// 1. Add  Bank Details
exports.addBankDetails = async (req, res) => {
  try {
    const { user_id, account_holder_name, bank_name, account_number, branch_name } = req.body;

    if (!user_id || !account_holder_name || !bank_name || !account_number) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const newBankDetail = {
      _id: new mongoose.Types.ObjectId(), // Generate a unique ID for the bank detail
      account_holder_name,
      bank_name,
      account_number,
      branch_name
    };

    const realtor = await Realtor.findOneAndUpdate(
      { user_id }, // Find realtor by user_id
      { $push: { bank_details: newBankDetail } }, // Append new bank detail instead of replacing
      { new: true, upsert: true } // Return updated document, create if not exists
    );

    res.status(200).json({ message: "Bank details added successfully", data: realtor });
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

exports.getBankDetailsById = async (req, res) => {
  try {
    const { bank_id } = req.params; // Get from URL parameters

    if (!bank_id) {
      return res.status(400).json({ message: "Bank ID is required" });
    }

    const realtor = await Realtor.findOne({ "bank_details._id": bank_id }, { "bank_details.$": 1 });

    if (!realtor || realtor.bank_details.length === 0) {
      return res.status(404).json({ message: "Bank details not found" });
    }

    res.status(200).json({ message: "Bank details retrieved successfully", data: realtor.bank_details[0] });
  } catch (error) {
    console.error("Error fetching bank details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.updateBankDetails = async (req, res) => {
  try {
    const { bank_id } = req.params; // Get from URL parameters
    const { bank_name, account_holder_name, account_number, branch_name } = req.body;

    if (!bank_id) {
      return res.status(400).json({ message: "Bank ID is required" });
    }

    // Build dynamic update query only for provided fields
    const updateQuery = {};
    if (bank_name !== undefined) updateQuery["bank_details.$.bank_name"] = bank_name;
    if (account_holder_name !== undefined) updateQuery["bank_details.$.account_holder_name"] = account_holder_name;
    if (account_number !== undefined) updateQuery["bank_details.$.account_number"] = account_number;
    if (branch_name !== undefined) updateQuery["bank_details.$.branch_name"] = branch_name;

    if (Object.keys(updateQuery).length === 0) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    const realtor = await Realtor.findOneAndUpdate(
      { "bank_details._id": bank_id }, // Find by bank ID
      { $set: updateQuery }, // Only update provided fields
      { new: true } // Return updated document
    );

    if (!realtor) {
      return res.status(404).json({ message: "Bank details not found" });
    }

    res.status(200).json({ message: "Bank details updated successfully", data: realtor });
  } catch (error) {
    console.error("Error updating bank details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


