const mongoose = require("mongoose");
const config = require("./config");

async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(config.mongoUrl);
  return mongoose.connection;
}

async function closeDb() {
  await mongoose.connection.close();
}

module.exports = { connectDb, closeDb };
