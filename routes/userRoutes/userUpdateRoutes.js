const express = require("express");
const router = express.Router();
const { updateUser } = require("../../controller/user/userUpdateController");
const { upload } = require("../../middlewares/multerConfig");

router.put("/update", upload.single("profilePicture"), updateUser);

module.exports = router;
