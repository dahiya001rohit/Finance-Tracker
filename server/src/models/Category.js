const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ["income", "expense", "investment", "refund"],
      required: true
    },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, name: 1, kind: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
