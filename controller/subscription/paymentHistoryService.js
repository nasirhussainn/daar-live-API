const PaymentHistory = require("../../models/PaymentHistory");
const Admin = require("../../models/Admin");

/**
 * Logs a payment transaction in the PaymentHistory collection.
 *
 * @param {Object} paymentData - Contains transaction details.
 * @param {String} paymentData.payer_type - Type of payer (e.g., "Realtor").
 * @param {String} paymentData.payer_id - ID of the payer.
 * @param {String} paymentData.transaction_id - Transaction ID.
 * @param {Number} paymentData.amount - Transaction amount.
 * @param {String} paymentData.entity_type - Type of entity (e.g., "subscription").
 * @param {String} paymentData.entity_id - Related entity ID.
 */
const logPaymentHistory = async ({
  payer_type,
  payer_id,
  transaction_id,
  amount,
  entity_type,
  entity_id,
}) => {
  try {
    // Fetch the Super Admin dynamically
    const superAdmin = await Admin.findOne({ role: "super" });

    if (!superAdmin) {
      console.error("Super Admin not found! Payment logging skipped.");
      return;
    }

    // Create and save the payment history entry
    const paymentEntry = new PaymentHistory({
      payer_type,
      payer_id,
      recipient_type: "Admin",
      recipient_id: superAdmin._id, // Use fetched Super Admin ID
      transaction_id,
      amount,
      entity_type,
      entity_id,
      status: "completed",
    });

    await paymentEntry.save();
    console.log("✅ Payment logged successfully!");

  } catch (error) {
    console.error("❌ Error logging payment:", error);
  }
};

module.exports = logPaymentHistory;
