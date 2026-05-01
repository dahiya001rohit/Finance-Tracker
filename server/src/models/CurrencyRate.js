const mongoose = require("mongoose");

const currencyRateSchema = new mongoose.Schema(
  {
    baseCurrency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    targetCurrency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    rate: { type: Number, required: true, min: 0 },
    effectiveDate: { type: String, required: true }
  },
  { timestamps: true }
);

currencyRateSchema.index(
  { baseCurrency: 1, targetCurrency: 1, effectiveDate: 1 },
  { unique: true }
);

module.exports = mongoose.model("CurrencyRate", currencyRateSchema);
