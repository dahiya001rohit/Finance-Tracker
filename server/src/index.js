// Load .env before anything else
const path = require("path");
const dotenvResult = require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
  override: true   // always prefer .env over shell env
});
console.log("[dotenv] loaded:", dotenvResult.error ? dotenvResult.error.message : "OK");
console.log("[dotenv] GROQ_API_KEY set:", !!process.env.GROQ_API_KEY);

const app = require("./app");
const config = require("./config");
const { connectDb } = require("./db");

connectDb()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`API listening on http://localhost:${config.port}`);
      console.log(`Groq AI: ${config.groq.apiKey ? "✅ enabled" : "❌ no key"}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  });
