const Admin = require('../models/Admin'); 

async function getSuperAdminId() {
  try {
    const superAdmin = await Admin.findOne({ isSuperAdmin: true }).select('_id');
    if (!superAdmin) {
      throw new Error('Super admin not found');
    }
    return superAdmin._id;
  } catch (error) {
    console.error('Error fetching super admin:', error);
    throw error;
  }
}

module.exports = { getSuperAdminId };
