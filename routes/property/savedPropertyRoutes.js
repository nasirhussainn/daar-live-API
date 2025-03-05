const express = require("express");
const router = express.Router();
const savedPropertyController = require("../../controller/properties/savedPropertyController");

router.post("/favourite/like", savedPropertyController.likeProperty);
router.delete("/favourite/dislike", savedPropertyController.dislikeProperty);
router.get("/favourite/:user_id", savedPropertyController.getSavedProperties);

module.exports = router;
