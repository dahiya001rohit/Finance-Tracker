const { connectDb, closeDb } = require("../src/db");
const User = require("../src/models/User");
const Category = require("../src/models/Category");
const Transaction = require("../src/models/Transaction");
const Budget = require("../src/models/Budget");
const Receipt = require("../src/models/Receipt");
const Notification = require("../src/models/Notification");
const CurrencyRate = require("../src/models/CurrencyRate");

async function main() {
  await connectDb();
  await Promise.all([
    User.init(),
    Category.init(),
    Transaction.init(),
    Budget.init(),
    Receipt.init(),
    Notification.init(),
    CurrencyRate.init()
  ]);
  console.log("MongoDB indexes initialized.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
