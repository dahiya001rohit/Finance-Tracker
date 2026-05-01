const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { badRequest, notFound } = require("../errors");
const Budget = require("../models/Budget");
const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const { toCents, fromCents } = require("../utils/money");
const { serializeBudget } = require("../utils/serialize");

const router = express.Router();

const budgetSchema = z.object({
  categoryId: z.string(),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default("INR"),
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

async function categoryBelongsToUser(userId, categoryId) {
  return Category.findOne({
    _id: categoryId,
    userId,
    kind: "expense",
    isDeleted: false
  });
}

async function spentForBudget(userId, budget) {
  const transactions = await Transaction.find({
    userId,
    categoryId: budget.categoryId?._id || budget.categoryId,
    currency: budget.currency,
    transactionDate: { $gte: `${budget.month}-01`, $lte: `${budget.month}-31` },
    kind: { $in: ["expense", "refund"] }
  });

  return transactions.reduce((sum, transaction) => {
    return sum + (transaction.kind === "refund" ? -transaction.amountCents : transaction.amountCents);
  }, 0);
}

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const budgets = await Budget.find({ userId: req.user.id, month })
      .populate("categoryId")
      .sort({ createdAt: -1 });
    const serialized = [];
    for (const budget of budgets) {
      serialized.push(serializeBudget(budget, await spentForBudget(req.user.id, budget)));
    }
    serialized.sort((a, b) => (a.category_name || "").localeCompare(b.category_name || ""));
    res.json({ budgets: serialized });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = budgetSchema.parse(req.body);
    const category = await categoryBelongsToUser(req.user.id, input.categoryId);
    if (!category) throw badRequest("Budget category must be an active expense category");
    const amountCents = toCents(input.amount);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw badRequest("Budget amount must be a positive decimal value");
    }

    const budget = await Budget.findOneAndUpdate(
      {
        userId: req.user.id,
        categoryId: input.categoryId,
        month: input.month,
        currency: input.currency.toUpperCase()
      },
      {
        userId: req.user.id,
        categoryId: input.categoryId,
        amountCents,
        currency: input.currency.toUpperCase(),
        month: input.month
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ budget: serializeBudget(budget) });
  })
);

router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = budgetSchema.parse(req.body);
    const category = await categoryBelongsToUser(req.user.id, input.categoryId);
    if (!category) throw badRequest("Budget category must be an active expense category");
    const amountCents = toCents(input.amount);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw badRequest("Budget amount must be a positive decimal value");
    }

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        categoryId: input.categoryId,
        amountCents,
        currency: input.currency.toUpperCase(),
        month: input.month
      },
      { returnDocument: "after" }
    );
    if (!budget) throw notFound("Budget not found");
    res.json({ budget: serializeBudget(budget) });
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!budget) throw notFound("Budget not found");
    res.json({ deleted: true });
  })
);

router.post(
  "/check-overruns",
  requireAuth,
  asyncHandler(async (req, res) => {
    const month = req.body.month || new Date().toISOString().slice(0, 7);
    const budgets = await Budget.find({ userId: req.user.id, month }).populate("categoryId");
    const overruns = [];

    for (const budget of budgets) {
      const spentCents = await spentForBudget(req.user.id, budget);
      if (spentCents > budget.amountCents) {
        const title = `Budget overrun: ${budget.categoryId?.name || "Category"}`;
        const body = `You spent ${fromCents(spentCents)} ${budget.currency} against a budget of ${fromCents(budget.amountCents)} ${budget.currency} for ${month}.`;
        await Notification.create({
          userId: req.user.id,
          budgetId: budget._id,
          title,
          body,
          sentAt: new Date()
        });
        overruns.push(serializeBudget(budget, spentCents));
      }
    }

    res.json({ overruns });
  })
);

module.exports = router;
