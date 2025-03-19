const { getHostsStats } = require("./getHostStats");
const { getRealtorStats } = require("./getRealtorStats");

const getTotalRevenue = async (userId) => {
  try {
    if (!userId) return null;

    // Fetch stats for both hosts (events) and realtors (properties)
    const [hostStats, realtorStats] = await Promise.all([
      getHostsStats(userId),
      getRealtorStats(userId),
    ]);

    // Calculate total revenue from both event hosting and property dealings
    const totalRevenue = 
      (hostStats?.totalTicketRevenue || 0) + 
      (realtorStats?.soldRevenue || 0) + 
      (realtorStats?.rentedRevenue || 0);

    return {
      totalRevenue,
      hostStats,
      realtorStats,
    };
  } catch (error) {
    console.error("Error fetching total revenue:", error);
    return null;
  }
};

module.exports = { getTotalRevenue };
