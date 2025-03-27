const AdminRevenue = require( "../models/admin/AdminRevenue")

const updateAdminRevenue = async (amount, category, period) => {
    try {
        const updateField = {};
        updateField[category] = amount; // E.g., { featured_revenue: 100 }

        await AdminRevenue.findOneAndUpdate(
            { period }, 
            { $inc: updateField, $set: { updated_at: Date.now() } }, 
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error("Error updating revenue:", error);
    }
};
module.exports = { updateAdminRevenue };

