const express = require("express");
const { sendMessage, getChatById, getChatsByParticipant, getChatHeadersByReferenceId, getChatDetailsById } = require("../../controller/chat/chatController");
const {sendAdminDirectMessage } = require('../../controller/chat/chatAdminController')
const { upload } = require("../../middlewares/multerConfig");

module.exports = (io) => {
  const router = express.Router();

  // Pass io to controller properly
  router.post("/send", upload.single("media"), (req, res, next) => sendMessage(req, res, next, io));
  router.post("/admin", upload.single("media"), (req, res, next) => sendAdminDirectMessage(req, res, next, io));

  router.get('/viaChat/:userId/:chatId?', getChatById);

  router.get("/viaUser/:participantId", getChatsByParticipant);

  router.get("/viaRef/:referenceId", getChatHeadersByReferenceId);

  router.get("/:chatId", getChatDetailsById);

  return router;
};
