const express = require("express");
const { sendMessage, getChatById, getChatsByParticipant, getChatHeadersByReferenceId, getChatDetailsById, getUnreadChatCount  } = require("../../controller/chat/chatController");
const { sendAdminDirectMessage1 } = require("../../controller/chat/chatAdminController");
const {sendAdminDirectMessage, getAdminChatsByParticipant, getChatByIdForUser, getChatByIdForAdmin  } = require('../../controller/chat/adminChatController')
const { upload } = require("../../middlewares/multerConfig");

module.exports = (io) => {
  const router = express.Router();

  // Pass io to controller properly
  router.post("/send", upload.single("media"), (req, res, next) => sendMessage(req, res, next, io));
  router.post("/admin", upload.single("media"), (req, res, next) => sendAdminDirectMessage1(req, res, next, io));

  router.get('/viaChat/:userId/:chatId?', getChatById);

  router.get("/viaUser/:participantId", getChatsByParticipant);

  router.get("/viaRef/:referenceId", getChatHeadersByReferenceId);

  router.get("/:chatId", getChatDetailsById);

  // -----------------------------------------------------------------------------
  // Admin Chat
  router.post("/admin/send", upload.single("media"), (req, res, next) => sendAdminDirectMessage(req, res, next, io));
  router.get("/admin/viaUser/:participantId", getAdminChatsByParticipant)
  router.get("/admin/viaChatUser/:userId", getChatByIdForUser)
  router.get("/admin/viaChatAdmin/:chatId", getChatByIdForAdmin)

  // ---------chat count unread
  router.get("/unread-count/:participantId", getUnreadChatCount);

  return router;
};
