// helpers/resolveUserType.js
const Admin = require("../models/Admin"); // adjust path as needed

/**
 * Determines the model type (Admin or User) based on the given ID.
 * @param {String|ObjectId} ownerId - The ID of the user.
 * @returns {Promise<'Admin'|'User'>} - The model type.
 */
const resolveUserType = async (ownerId) => {
  const isAdmin = await Admin.exists({ _id: ownerId });
  return isAdmin ? "Admin" : "User";
};

module.exports = resolveUserType;
