const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

exports.authenticateSuperAdmin = async (req, res, next) => {
  try {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Access Denied" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isSuperAdmin) {
      return res
        .status(403)
        .json({ message: "Only Super Admins can perform this action" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
