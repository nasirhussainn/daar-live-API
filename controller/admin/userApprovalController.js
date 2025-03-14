const User = require("../../models/User");

// @desc    Update user account status
// @route   PUT /api/user/:userId/status
// @access  Public or Protected (as per your requirement)
const updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  // Allowed statuses
  const allowedStatuses = ["pending", "approved", "declined", "active"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { account_status: status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User status updated successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error updating user status", error: error.message });
  }
};

module.exports = { updateUserStatus };
