const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    budgetId: { type: mongoose.Schema.Types.ObjectId, ref: "Budget" },
    title:    { type: String, required: true },
    body:     { type: String, default: "" },
    isRead:   { type: Boolean, default: false },
    sentAt:   { type: Date, default: Date.now }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
