const express = require("express");
const multer = require("multer");
const { z } = require("zod");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { badRequest, notFound } = require("../errors");
const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const Receipt = require("../models/Receipt");
const { toCents } = require("../utils/money");
const { serializeTransaction, serializeReceipt } = require("../utils/serialize");

const router = express.Router();

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"];
    cb(null, allowed.includes(file.mimetype) || file.originalname.endsWith(".csv"));
  }
});

const txSchema = z.object({
  categoryId:      z.string().nullable().optional(),
  kind:            z.enum(["income", "expense", "investment", "refund"]),
  amount:          z.coerce.number().min(0),
  currency:        z.string().length(3).default("INR"),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description:     z.string().max(500).default("")
});

async function assertCategory(userId, categoryId, kind) {
  if (!categoryId) return;
  const category = await Category.findOne({ _id: categoryId, userId, isDeleted: false });
  if (!category) throw badRequest("Category does not exist");
  if (category.kind !== kind && !(kind === "refund" && category.kind === "expense")) {
    throw badRequest("Category kind does not match transaction kind");
  }
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') { field += '"'; index += 1; }
    else if (char === '"')                        { quoted = !quoted; }
    else if (char === "," && !quoted)             { row.push(field.trim()); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; field = "";
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(h) { return h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""); }
function getValue(record, names) {
  for (const name of names) {
    const v = record[normalizeHeader(name)];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function parseDate(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    const dayFirst = first > 12;
    const month = String(dayFirst ? second : first).padStart(2, "0");
    const day = String(dayFirst ? first : second).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

function parseMoney(value) {
  if (value === undefined || value === null || String(value).trim() === "") return NaN;
  const cleaned = String(value || "").replace(/[₹$€£,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : NaN;
}

function inferCategory(description) {
  const text = description.toLowerCase();
  const rules = [
    ["Food",       ["restaurant", "cafe", "zomato", "swiggy", "grocery", "food", "lunch", "dinner"]],
    ["Transport",  ["uber", "ola", "fuel", "metro", "bus", "train", "taxi", "rapido"]],
    ["Shopping",   ["amazon", "flipkart", "myntra", "store", "shopping", "meesho"]],
    ["Bills",      ["electricity", "wifi", "internet", "mobile", "bill", "recharge", "broadband"]],
    ["Rent",       ["rent", "landlord", "housing"]],
    ["Salary",     ["salary", "payroll", "stipend", "credit by"]],
    ["Investment", ["mutual fund", "sip", "stock", "broker", "zerodha", "groww"]]
  ];
  return rules.find(([, words]) => words.some((w) => text.includes(w)))?.[0] || "Imported";
}

function inferKind(record, amount, description) {
  const explicit = getValue(record, ["kind", "type", "transaction_type", "transaction type"]);
  const marker = `${explicit} ${description}`.toLowerCase();
  if (marker.includes("refund"))                                              return "refund";
  if (marker.includes("investment") || marker.includes("mutual fund") || marker.includes("sip")) return "investment";
  if (marker.includes("credit") || marker.includes("deposit") || marker.includes("income"))  return "income";
  if (marker.includes("debit") || marker.includes("withdrawal") || marker.includes("expense")) return "expense";
  return amount < 0 ? "expense" : "income";
}

async function findOrCreateCategory(userId, name, kind) {
  const categoryKind = kind === "refund" ? "expense" : kind;
  const existing = await Category.findOne({ userId, name, kind: categoryKind, isDeleted: false });
  if (existing) return existing;
  try {
    return await Category.create({ userId, name, kind: categoryKind });
  } catch (error) {
    if (error.code === 11000) return Category.findOne({ userId, name, kind: categoryKind, isDeleted: false });
    throw error;
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/transactions
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { month, kind, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id };

    if (kind) filter.kind = kind;
    if (month) {
      filter.transactionDate = { $regex: `^${month}-` };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("categoryId")
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter)
    ]);

    const receipts = await Receipt.find({
      transactionId: { $in: transactions.map((t) => t._id) }
    });
    const receiptByTx = new Map(receipts.map((r) => [r.transactionId.toString(), r.url]));

    res.json({
      transactions: transactions.map((t) =>
        serializeTransaction({ ...t.toObject(), receiptUrl: receiptByTx.get(t._id.toString()) })
      ),
      total,
      page:  Number(page),
      limit: Number(limit)
    });
  })
);

// GET /api/transactions/:id
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id })
      .populate("categoryId");
    if (!transaction) throw notFound("Transaction not found");
    const receipt = await Receipt.findOne({ transactionId: transaction._id });
    res.json({
      transaction: serializeTransaction({ ...transaction.toObject(), receiptUrl: receipt?.url })
    });
  })
);

// POST /api/transactions
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = txSchema.parse(req.body);
    await assertCategory(req.user.id, input.categoryId, input.kind);
    const amountCents = toCents(input.amount);
    if (!Number.isInteger(amountCents) || amountCents < 0) {
      throw badRequest("Amount must be a non-negative decimal value");
    }

    const transaction = await Transaction.create({
      userId:          req.user.id,
      categoryId:      input.categoryId || null,
      kind:            input.kind,
      amountCents,
      currency:        input.currency.toUpperCase(),
      transactionDate: input.transactionDate,
      description:     input.description
    });
    res.status(201).json({ transaction: serializeTransaction(transaction) });
  })
);

// POST /api/transactions/import-csv
router.post(
  "/import-csv",
  requireAuth,
  csvUpload.single("statement"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("CSV file is required");

    const fallbackCurrency = String(req.body.currency || "INR").toUpperCase();
    const rows = parseCsv(req.file.buffer.toString("utf8"));
    if (rows.length < 2) throw badRequest("CSV must include a header row and at least one data row");

    const headers = rows[0].map(normalizeHeader);
    const imported = [];
    const skipped  = [];

    for (const [index, row] of rows.slice(1).entries()) {
      const record = Object.fromEntries(headers.map((h, i) => [h, row[i] || ""]));
      const date = parseDate(getValue(record, ["date", "transaction_date", "transaction date", "posted date"]));
      const description =
        getValue(record, ["description", "details", "narration", "merchant", "memo"]) ||
        `Imported row ${index + 2}`;

      let amount = parseMoney(getValue(record, ["amount", "value", "transaction amount"]));
      const debit  = parseMoney(getValue(record, ["debit", "withdrawal", "paid out"]));
      const credit = parseMoney(getValue(record, ["credit", "deposit", "paid in"]));

      if (!Number.isFinite(amount)) {
        if (Number.isFinite(debit)  && debit  > 0) amount = -debit;
        if (Number.isFinite(credit) && credit > 0) amount = credit;
      }

      if (!date || !Number.isFinite(amount) || amount === 0) {
        skipped.push({ row: index + 2, reason: "Missing valid date or amount" });
        continue;
      }

      const kind = inferKind(record, amount, description);
      const amountCents = toCents(Math.abs(amount));
      if (!Number.isInteger(amountCents) || amountCents <= 0) {
        skipped.push({ row: index + 2, reason: "Invalid amount" });
        continue;
      }

      const currency = (getValue(record, ["currency", "ccy"]) || fallbackCurrency).toUpperCase();
      const categoryName = getValue(record, ["category", "category name"]) || inferCategory(description);
      const category = await findOrCreateCategory(req.user.id, categoryName, kind);

      const duplicate = await Transaction.findOne({
        userId: req.user.id, kind, amountCents, currency, transactionDate: date, description
      });
      if (duplicate) {
        skipped.push({ row: index + 2, reason: "Duplicate transaction" });
        continue;
      }

      const transaction = await Transaction.create({
        userId:          req.user.id,
        categoryId:      category?._id || null,
        kind,
        amountCents,
        currency,
        transactionDate: date,
        description
      });
      imported.push(serializeTransaction(transaction));
    }

    res.status(201).json({
      importedCount: imported.length,
      skippedCount:  skipped.length,
      skipped,
      transactions:  imported
    });
  })
);

// PUT /api/transactions/:id
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = txSchema.parse(req.body);
    await assertCategory(req.user.id, input.categoryId, input.kind);
    const amountCents = toCents(input.amount);
    if (!Number.isInteger(amountCents) || amountCents < 0) {
      throw badRequest("Amount must be a non-negative decimal value");
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        categoryId:      input.categoryId || null,
        kind:            input.kind,
        amountCents,
        currency:        input.currency.toUpperCase(),
        transactionDate: input.transactionDate,
        description:     input.description
      },
      { returnDocument: "after" }
    ).populate("categoryId");
    if (!transaction) throw notFound("Transaction not found");
    res.json({ transaction: serializeTransaction(transaction) });
  })
);

// DELETE /api/transactions/:id
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!transaction) throw notFound("Transaction not found");
    await Receipt.deleteMany({ transactionId: transaction._id, userId: req.user.id });
    res.json({ deleted: true });
  })
);

// POST /api/transactions/:id/receipt
router.post(
  "/:id/receipt",
  requireAuth,
  upload.single("receipt"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("Receipt file is required");
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!tx) throw notFound("Transaction not found");

    // Replace existing receipt if any
    await Receipt.deleteMany({ transactionId: req.params.id, userId: req.user.id });

    const receipt = await Receipt.create({
      userId:       req.user.id,
      transactionId: req.params.id,
      originalName: req.file.originalname,
      storedName:   req.file.filename,
      mimeType:     req.file.mimetype,
      sizeBytes:    req.file.size,
      url:          `/uploads/${req.file.filename}`
    });
    res.status(201).json({ receipt: serializeReceipt(receipt) });
  })
);

module.exports = router;
