const Withdraw = require("../../models/Withdraw");
const User = require("../../models/User");
const Admin = require("../../models/Admin");
const Realtor = require("../../models/Realtor");
const {
  sendWithdrawalRequestEmail,
  sendWithdrawalStatusUpdateEmail,
} = require("../../config/mailer");

// Request a withdrawal
exports.requestWithdraw = async (req, res) => {
  try {
    const { user_id, amount, bank_details } = req.body;

    if (!user_id || !amount || !bank_details) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is a Realtor and fetch total_revenue
    const realtor = await Realtor.findOne({ user_id });
    if (!realtor) {
      return res.status(403).json({ message: "User is not a Realtor" });
    }

    // Check if the user already has a pending withdrawal request
    const existingPendingRequest = await Withdraw.findOne({
      user_id,
      status: "pending",
    });

    if (existingPendingRequest) {
      return res
        .status(400)
        .json({ message: "You already have a pending withdrawal request" });
    }

    // Validate available balance
    if (amount > realtor.available_revenue) {
      return res
        .status(400)
        .json({ message: "Insufficient balance for withdrawal" });
    }

    // Create withdrawal request
    const withdrawRequest = new Withdraw({
      user_id,
      amount,
      bank_details,
      status: "pending",
    });

    await withdrawRequest.save();
    await sendWithdrawalRequestEmail(withdrawRequest, user);

    res
      .status(201)
      .json({ message: "Withdrawal request submitted", data: withdrawRequest });
  } catch (error) {
    console.error("Error requesting withdrawal:", error);
    res
      .status(500)
      .json({ message: "Error processing request", error: error.message });
  }
};

exports.getWithdrawRequestById = async (req, res) => {
  try {
    const { withdraw_id } = req.params;

    // Find withdrawal request by ID
    const withdrawRequest = await Withdraw.findById(withdraw_id);

    if (!withdrawRequest) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    res.status(200).json(withdrawRequest);
  } catch (error) {
    console.error("Error fetching withdrawal request details:", error);
    res
      .status(500)
      .json({
        message: "Error fetching withdrawal request",
        error: error.message,
      });
  }
};

// Get all withdrawals (Admin)
exports.getAllWithdrawals = async (req, res) => {
  let query = {};
  const { status } = req.query; // Optional status filter

  if (status) query.status = status; // Apply status filter if provided
  try {
    const withdrawals = await Withdraw.find(query).sort({ created_at: -1 });
    res.status(200).json(withdrawals);
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    res
      .status(500)
      .json({ message: "Error fetching withdrawals", error: error.message });
  }
};

// Get withdrawals for a specific user
exports.getUserWithdrawals = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { status } = req.query; // Optional status filter

    let query = { user_id }; // Ensure filtering by user_id

    if (status) {
      query.status = status; // Apply status filter if provided
    }

    const withdrawals = await Withdraw.find(query).sort({ created_at: -1 });

    res.status(200).json(withdrawals);
  } catch (error) {
    console.error("Error fetching user withdrawals:", error);
    res
      .status(500)
      .json({ message: "Error fetching withdrawals", error: error.message });
  }
};

exports.updateWithdrawRequest = async (req, res) => {
  try {
    const { withdraw_id } = req.params;
    const { amount, bank_details } = req.body;

    // Find the withdrawal request
    const withdrawRequest = await Withdraw.findById(withdraw_id);

    if (!withdrawRequest) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    // Check if the request is still pending
    if (withdrawRequest.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending requests can be updated" });
    }

    // Update fields if provided
    if (amount) withdrawRequest.amount = amount;
    if (bank_details) withdrawRequest.bank_details = bank_details;

    // Update the timestamp
    withdrawRequest.updated_at = new Date();

    // Save the updated request
    await withdrawRequest.save();

    res
      .status(200)
      .json({ message: "Withdrawal request updated", data: withdrawRequest });
  } catch (error) {
    console.error("Error updating withdrawal request:", error);
    res
      .status(500)
      .json({ message: "Error updating request", error: error.message });
  }
};

// Approve or Reject Withdrawal (Admin)
exports.updateWithdrawStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status input
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Find the withdrawal request
    const withdrawRequest = await Withdraw.findById(id);
    if (!withdrawRequest) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    // Check if it's already processed
    if (withdrawRequest.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending requests can be updated" });
    }

    // Update the status
    withdrawRequest.status = status;
    withdrawRequest.updated_at = Date.now();
    await withdrawRequest.save();

    // Fetch the user and realtor details
    const realtor = await Realtor.findOne({ user_id: withdrawRequest.user_id });
    const actual_user = await User.findById(withdrawRequest.user_id);

    // Deduct balance if approved
    if (status === "approved" && realtor) {
      realtor.available_revenue -= withdrawRequest.amount;
      await realtor.save();
    }

    // Send email notification
    await sendWithdrawalStatusUpdateEmail(withdrawRequest, actual_user);

    res
      .status(200)
      .json({ message: `Withdrawal ${status}`, data: withdrawRequest });
  } catch (error) {
    console.error("Error updating withdrawal:", error);
    res
      .status(500)
      .json({ message: "Error updating withdrawal", error: error.message });
  }
};

// Delete Withdrawal (Admin)
exports.deleteWithdraw = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedWithdraw = await Withdraw.findByIdAndDelete(id);
    if (!deletedWithdraw) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    res
      .status(200)
      .json({ message: "Withdrawal request deleted successfully" });
  } catch (error) {
    console.error("Error deleting withdrawal:", error);
    res
      .status(500)
      .json({ message: "Error deleting withdrawal", error: error.message });
  }
};
