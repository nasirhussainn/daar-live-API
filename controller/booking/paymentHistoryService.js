const PaymentHistory = require("../../models/PaymentHistory");
const Admin = require("../../models/Admin");
const Realtor = require("../../models/Realtor");

const logPaymentHistory = async (booking, payment_detail, entity_type) => {
  try {
    // Get recipient details (Admin or Realtor)
    let recipient;
    let recipient_type;

    if (booking.owner_type === "Admin") {
      recipient = await Admin.findById(booking.owner_id);
      recipient_type = "Admin";
    } else {
      recipient = await Realtor.findOne({ user_id: booking.owner_id });
      recipient_type = "Realtor";
    }

    // Create and save payment history entry
    const paymentEntry = new PaymentHistory({
      payer_type: "User",
      payer_id: booking.user_id,
      recipient_type: recipient_type,
      recipient_id: recipient._id,
      transaction_id: booking._id, // Assuming booking has a unique ID
      amount: payment_detail.amount,
      entity_type: entity_type,
      entity_id: booking._id, // Should be linked to booking
      status: "completed",
    });

    await paymentEntry.save(); // Save payment history
    console.log("Payment history logged successfully");

    return paymentEntry; // Return the entry for reference if needed
  } catch (error) {
    console.error("Error logging payment history:", error.message);
    throw error; // Throw the error to be handled by the calling function
  }
};

// Export the function for reuse
module.exports = { logPaymentHistory };
