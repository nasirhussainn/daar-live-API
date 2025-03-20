const Withdraw = require("../../models/Withdraw");
const User = require("../../models/User");
const Admin = require("../../models/Admin");
const Realtor = require("../../models/Realtor")
const {  sendWithdrawalRequestEmail, sendWithdrawalStatusUpdateEmail } = require("../../config/mailer")

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
      const actual_user = await User.findById(user_id);
  
      if (!realtor) {
        return res.status(403).json({ message: "User is not a Realtor" });
      }
  
      // Validate available balance
      if (amount > realtor.available_revenue) {
        return res.status(400).json({ message: "Insufficient balance for withdrawal" });
      }
  
      // Create withdrawal request
      const withdrawRequest = new Withdraw({
        user_id,
        amount,
        bank_details,
        status: "pending",
      });
  
      await withdrawRequest.save();
      await sendWithdrawalRequestEmail(withdrawRequest, actual_user);
      res.status(201).json({ message: "Withdrawal request submitted", data: withdrawRequest });
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      res.status(500).json({ message: "Error processing request", error: error.message });
    }
  };
  

// Get all withdrawals (Admin)
exports.getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdraw.find().sort({ created_at: -1 });
    res.status(200).json(withdrawals);
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    res.status(500).json({ message: "Error fetching withdrawals", error: error.message });
  }
};

// Get withdrawals for a specific user
exports.getUserWithdrawals = async (req, res) => {
  try {
    const { user_id } = req.params;

    const withdrawals = await Withdraw.find({ user_id }).sort({ created_at: -1 });
    res.status(200).json(withdrawals);
  } catch (error) {
    console.error("Error fetching user withdrawals:", error);
    res.status(500).json({ message: "Error fetching withdrawals", error: error.message });
  }
};

// Approve or Reject Withdrawal (Admin)
exports.updateWithdrawStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const withdrawRequest = await Withdraw.findById(id);
    if (!withdrawRequest) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    withdrawRequest.status = status;
    withdrawRequest.updated_at = Date.now();
    await withdrawRequest.save();

    const realtor = await Realtor.findOne({ user_id });
    const actual_user = await User.findById(user_id);
    if (status === "approved") {
        realtor.available_revenue -= withdrawRequest.amount;
        await realtor.save();
    }

    await sendWithdrawalStatusUpdateEmail(withdrawRequest, actual_user)


    res.status(200).json({ message: `Withdrawal ${status}`, data: withdrawRequest });
  } catch (error) {
    console.error("Error updating withdrawal:", error);
    res.status(500).json({ message: "Error updating withdrawal", error: error.message });
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

    res.status(200).json({ message: "Withdrawal request deleted successfully" });
  } catch (error) {
    console.error("Error deleting withdrawal:", error);
    res.status(500).json({ message: "Error deleting withdrawal", error: error.message });
  }
};
