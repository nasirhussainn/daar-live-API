const express = require("express");
const router = express.Router();
const { updateUser } = require("../../controller/user/userUpdateController");
const { uploadSignup } = require("../../middlewares/multerConfig")

router.put("/update", uploadSignup, updateUser);

module.exports = router;
