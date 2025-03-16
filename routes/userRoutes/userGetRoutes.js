const express = require("express");
const router = express.Router();
const userController = require("../../controller/user/userGetController");

router.get("/user-via-token/:login_token", userController.getUserByToken);
router.get("/user-via-id/:_id", userController.getUserById);
router.get("/user", userController.getUserByEmailAndRole);
router.get("/buyers", userController.getBuyers);
router.get("/realtors", userController.getRealtors);

module.exports = router;
