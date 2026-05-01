const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { generateFinanceInsight } = require("../services/groq");
const config = require("../config");
const Transaction = require("../models/Transaction");
const { fromCents } = require("../utils/money");
const { serializeTransaction } = require("../utils/serialize");

const router = express.Router();

function monthFilter(month) {
  // Use regex to avoid the month-31 problem (Feb has no day 31)
  return { $regex: `^${month}-` };
}

function addToTotals(totals, transaction) {
  const currency = transaction.currency;
  if (!totals.has(currency)) {
    totals.set(currency, { currency, income: 0, expenses: 0, investments: 0 });
  }
  const row = totals.get(currency);
  if (transaction.kind === "income")     row.income      += transaction.amountCents;
  if (transaction.kind === "expense")    row.expenses    += transaction.amountCents;
  if (transaction.kind === "refund")     row.expenses    -= transaction.amountCents;
  if (transaction.kind === "investment") row.investments += transaction.amountCents;
}

function totalsToRows(totals) {
  return [...totals.values()]
    .sort((a, b) => a.currency.localeCompare(b.currency))
    .map((row) => ({
      currency:    row.currency,
      income:      fromCents(row.income),
      expenses:    fromCents(row.expenses),
      investments: fromCents(row.investments),
      savings:     fromCents(row.income - row.expenses - row.investments)
    }));
}

// GET /api/reports/dashboard
router.get(
  "/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const transactions = await Transaction.find({
      userId: req.user.id,
      transactionDate: monthFilter(month)
    }).populate("categoryId");

    const totals = new Map();
    const categoryMap = new Map();
    for (const transaction of transactions) {
      addToTotals(totals, transaction);
      if (["expense", "refund"].includes(transaction.kind)) {
        const key = `${transaction.currency}:${transaction.categoryId?.name || "Uncategorized"}`;
        const sign = transaction.kind === "refund" ? -1 : 1;
        categoryMap.set(key, {
          currency:      transaction.currency,
          category_name: transaction.categoryId?.name || "Uncategorized",
          amountCents:
            (categoryMap.get(key)?.amountCents || 0) + sign * transaction.amountCents
        });
      }
    }

    const recent = await Transaction.find({ userId: req.user.id })
      .populate("categoryId")
      .sort({ transactionDate: -1, createdAt: -1 })
      .limit(10);

    res.json({
      month,
      totals: totalsToRows(totals),
      categories: [...categoryMap.values()]
        .sort((a, b) => b.amountCents - a.amountCents)
        .map((row) => ({
          currency:      row.currency,
          category_name: row.category_name,
          amount:        fromCents(row.amountCents)
        })),
      recent: recent.map(serializeTransaction)
    });
  })
);

// GET /api/reports/monthly
router.get(
  "/monthly",
  requireAuth,
  asyncHandler(async (req, res) => {
    const months = Number(req.query.months || 6);
    const count = Math.max(1, Math.min(months, 24));
    const start = new Date();
    start.setDate(1);
    start.setMonth(start.getMonth() - count + 1);
    const startMonth = start.toISOString().slice(0, 7);
    const transactions = await Transaction.find({
      userId: req.user.id,
      transactionDate: { $gte: `${startMonth}-01` }
    });

    const byMonthCurrency = new Map();
    for (const transaction of transactions) {
      const month = transaction.transactionDate.slice(0, 7);
      const key = `${month}:${transaction.currency}`;
      if (!byMonthCurrency.has(key)) {
        byMonthCurrency.set(key, { month, currency: transaction.currency, income: 0, expenses: 0, investments: 0 });
      }
      const row = byMonthCurrency.get(key);
      if (transaction.kind === "income")     row.income      += transaction.amountCents;
      if (transaction.kind === "expense")    row.expenses    += transaction.amountCents;
      if (transaction.kind === "refund")     row.expenses    -= transaction.amountCents;
      if (transaction.kind === "investment") row.investments += transaction.amountCents;
    }

    const report = [...byMonthCurrency.values()]
      .sort((a, b) => a.month.localeCompare(b.month) || a.currency.localeCompare(b.currency))
      .map((row) => ({
        month:       row.month,
        currency:    row.currency,
        income:      fromCents(row.income),
        expenses:    fromCents(row.expenses),
        investments: fromCents(row.investments)
      }));
    res.json({ report });
  })
);

// GET /api/reports/category-summary
router.get(
  "/category-summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const transactions = await Transaction.find({
      userId: req.user.id,
      transactionDate: monthFilter(month)
    }).populate("categoryId");

    const summary = new Map();
    for (const transaction of transactions) {
      const key = `${transaction.kind}:${transaction.currency}:${transaction.categoryId?.name || "Uncategorized"}`;
      const sign = transaction.kind === "refund" ? -1 : 1;
      const existing = summary.get(key) || {
        kind:          transaction.kind,
        currency:      transaction.currency,
        category_name: transaction.categoryId?.name || "Uncategorized",
        amountCents:   0
      };
      existing.amountCents += sign * transaction.amountCents;
      summary.set(key, existing);
    }

    res.json({
      summary: [...summary.values()]
        .sort((a, b) => a.kind.localeCompare(b.kind) || b.amountCents - a.amountCents)
        .map((row) => ({
          kind:          row.kind,
          currency:      row.currency,
          category_name: row.category_name,
          amount:        fromCents(row.amountCents)
        }))
    });
  })
);

// GET /api/reports/ai-insight
router.get(
  "/ai-insight",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Read live from process.env so hot-reloads always pick up the latest value
    const groqKey = process.env.GROQ_API_KEY || config.groq.apiKey;
    console.log("[ai-insight] GROQ_API_KEY present:", !!groqKey);
    if (!groqKey) {
      return res.json({
        comingSoon: true,
        insight: null,
        message: "AI Insights are coming soon. Add GROQ_API_KEY to .env to enable."
      });
    }

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const transactions = await Transaction.find({
      userId: req.user.id,
      transactionDate: monthFilter(month)
    }).populate("categoryId");

    const totals = new Map();
    const categories = new Map();

    for (const transaction of transactions) {
      const totalKey = `${transaction.kind}:${transaction.currency}`;
      const totalSign = transaction.kind === "refund" ? -1 : 1;
      totals.set(totalKey, {
        kind:     transaction.kind,
        currency: transaction.currency,
        amount:
          (totals.get(totalKey)?.amount || 0) + totalSign * transaction.amountCents
      });

      const categoryKey = `${transaction.categoryId?.name || "Uncategorized"}:${transaction.kind}:${transaction.currency}`;
      categories.set(categoryKey, {
        name:     transaction.categoryId?.name || "Uncategorized",
        kind:     transaction.kind,
        currency: transaction.currency,
        amount:
          (categories.get(categoryKey)?.amount || 0) + totalSign * transaction.amountCents
      });
    }

    const insight = await generateFinanceInsight({
      month,
      totals: [...totals.values()].map((row) => ({ ...row, amount: fromCents(row.amount) })),
      categoryBreakdown: [...categories.values()].map((row) => ({ ...row, amount: fromCents(row.amount) }))
    }, groqKey);

    res.json({ comingSoon: false, insight });
  })
);

module.exports = router;
