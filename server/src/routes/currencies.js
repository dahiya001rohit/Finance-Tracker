const express = require("express");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// Hardcoded rates relative to INR (as of recent update)
// In production these would be refreshed from an external provider
const BASE_RATES = {
  INR: 1,
  USD: 0.01199,
  EUR: 0.01105,
  GBP: 0.00944,
  AED: 0.04404,
  SGD: 0.01618,
  JPY: 1.8125,
  CAD: 0.01668,
  AUD: 0.01878,
  CHF: 0.01076
};

// GET /api/currencies
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ currencies: Object.keys(BASE_RATES) });
  })
);

// GET /api/currencies/rates
router.get(
  "/rates",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      base: "INR",
      rates: BASE_RATES,
      note: "Static rates for display purposes. Updated periodically.",
      updatedAt: "2025-01-01"
    });
  })
);

module.exports = router;
