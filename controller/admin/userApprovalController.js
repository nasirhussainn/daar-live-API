const { sendAccountStatusUpdateEmail } = require("../../config/mailer");
const User = require("../../models/User");

const updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["pending", "approved", "declined", "active"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { account_status: status },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send email notification about status update
    await sendAccountStatusUpdateEmail(user);

    return res.status(200).json({
      message: "User status updated successfully and email sent",
      user,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating user status", error: error.message });
  }
};

module.exports = { updateUserStatus };
