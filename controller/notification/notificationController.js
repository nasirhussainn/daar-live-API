const Notification = require("../../models/Notification");

// @desc    Get notifications for a user with pagination
// @route   GET /api/notifications?page=1&limit=10
// @access  Private
exports.getUserNotifications = async (req, res) => {
  try {
    let { user_id, page, limit } = req.query; // Get pagination params from query

    const userId = user_id; 
    // Set default values for page & limit if not provided
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit; // Calculate the number of documents to skip

    // Fetch paginated notifications
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 }) // Show latest notifications first
      .skip(skip)
      .limit(limit);

    // Count total notifications for the user
    const totalNotifications = await Notification.countDocuments({ user: userId });

    res.status(200).json({
      success: true,
      totalNotifications,
      currentPage: page,
      totalPages: Math.ceil(totalNotifications / limit),
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Error fetching notifications" });
  }
};
