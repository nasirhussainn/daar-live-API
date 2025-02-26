const express = require("express");
const { sendMessage, getChatsByProperty, getChatById } = require("../../controller/chat/chatController");
const { upload } = require("../../middlewares/multerConfig");

const router = express.Router();

router.post("/send", upload.single("media"), sendMessage);
router.get("/property/:propertyId", getChatsByProperty);
router.get("/:chatId", getChatById);

module.exports = router;
