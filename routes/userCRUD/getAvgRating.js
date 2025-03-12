const Realtor = require("../../models/Realtor")

const getAvgRating = async (userId) => {
    try {
        const realtor = await Realtor.findOne({ user_id: userId });
        return realtor ? realtor.avg_rating : 0;
    } catch (error) {
        console.error("Error fetching average rating:", error);
        return 0;
    }
};

module.exports = { getAvgRating };