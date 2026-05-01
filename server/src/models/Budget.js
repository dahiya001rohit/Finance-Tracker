const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    amountCents: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR", uppercase: true, minlength: 3, maxlength: 3 },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ }
  },
  { timestamps: true }
);

budgetSchema.index(
  { userId: 1, categoryId: 1, month: 1, currency: 1 },
  { unique: true }
);

module.exports = mongoose.model("Budget", budgetSchema);
