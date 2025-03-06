const express = require("express");
const { sendMessage, getChatById, getChatsByParticipant } = require("../../controller/chat/chatController");
const { upload } = require("../../middlewares/multerConfig");

module.exports = (io) => {
  const router = express.Router();

  // Pass io to controller properly
  router.post("/send", upload.single("media"), (req, res, next) => sendMessage(req, res, next, io));

  router.get('/viaChat/:userId/:chatId?', getChatById);

  router.get("/viaUser/:participantId", getChatsByParticipant);

  return router;
};
