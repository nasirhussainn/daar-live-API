const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SavedPropertySchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  property_id: { type: Schema.Types.ObjectId, ref: "Property", required: true },
  status: { type: String, enum: ["like", "unlike"], default: "unlike" }, // 'saved' for like, 'removed' for dislike
  created_at: { type: Date, default: Date.now },
});

const SavedProperty = mongoose.model("SavedProperty", SavedPropertySchema);
module.exports = SavedProperty;
