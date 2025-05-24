const express = require("express");
const { authenticateSuperAdmin } = require("../../middlewares/auth");
const {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  changeSuperAdminPassword,
} = require("../../controller/admin/adminController");

const router = express.Router();

router.post("/create", authenticateSuperAdmin, createAdmin);
router.get("/", authenticateSuperAdmin, getAllAdmins);
router.get("/:id", authenticateSuperAdmin, getAdminById);
router.put("/:id", authenticateSuperAdmin, updateAdmin);
router.delete("/:id", authenticateSuperAdmin, deleteAdmin);
router.post("/login", loginAdmin);
router.put(
  "/super/change-password",
  authenticateSuperAdmin,
  changeSuperAdminPassword,
);

module.exports = router;
