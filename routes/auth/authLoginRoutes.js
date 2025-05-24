const express = require("express");
const {
  login,
  firebaseLogin,
} = require("../../controller/auth/authLoginController");

const router = express.Router();

router.post("/login", login);
router.post("/firebase-login", firebaseLogin);

module.exports = router;
