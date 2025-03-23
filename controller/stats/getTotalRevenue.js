const { getHostsStats } = require("./getHostStats");
const { getRealtorStats } = require("./getRealtorStats");
const Realtor = require("../../models/Realtor");

const getTotalRevenue = async (userId) => {
  try {
    if (!userId) return null;

    // Fetch stats for both hosts (events) and realtors (properties)
    const [hostStats, realtorStats] = await Promise.all([
      getHostsStats(userId),
      getRealtorStats(userId),
    ]);

    // Calculate total listed properties and events
    const totalCurrentListed =
      (hostStats?.currentHosted || 0) + (realtorStats?.currentListed || 0);

    const totalAllListed =
      (hostStats?.totalHosted || 0) + (realtorStats?.allListed || 0);

    const result = await Realtor.findOne({ user_id: userId })
      .select("total_revenue available_revenue")
      .lean();

    const totalRevenue = result?.total_revenue || 0;
    const availableRevenue = result?.available_revenue || 0;

    return {
      totalRevenue,
      availableRevenue,
      totalCurrentListed,
      totalAllListed,
      hostStats,
      realtorStats,
    };
  } catch (error) {
    console.error("Error fetching total revenue:", error);
    return null;
  }
};

module.exports = { getTotalRevenue };
