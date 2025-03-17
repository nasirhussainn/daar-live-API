const PaymentHistory = require("../../models/PaymentHistory");

// Get all payment histories
const getAllPayments = async (req, res) => {
  try {
    const payments = await PaymentHistory.find().sort({ created_at: -1 });
    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get payment history by user or realtor
const getPaymentsByUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const payments = await PaymentHistory.find({
      $or: [{ payer_id: user_id }, { recipient_id: user_id }],
    }).sort({ created_at: -1 });

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching user payments:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { getAllPayments, getPaymentsByUser };
