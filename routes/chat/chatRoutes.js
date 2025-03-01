const express = require("express");
const { sendMessage, getChatsByProperty, getChatById } = require("../../controller/chat/chatController");
const { upload } = require("../../middlewares/multerConfig");

module.exports = (io) => {
  const router = express.Router();

  // Pass io to controller properly
  router.post("/send", upload.single("media"), (req, res, next) => sendMessage(req, res, next, io));
  router.get("/property/:propertyId", getChatsByProperty);
  router.get("/:chatId", getChatById);

  return router;
};
