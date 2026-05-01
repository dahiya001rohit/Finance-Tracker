const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    kind: {
      type: String,
      enum: ["income", "expense", "investment", "refund"],
      required: true
    },
    amountCents: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR", uppercase: true, minlength: 3, maxlength: 3 },
    transactionDate: { type: String, required: true },
    description: { type: String, default: "", maxlength: 500 }
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, transactionDate: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
