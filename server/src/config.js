const path = require("path");
// Resolve .env relative to this file (src/ → server/) regardless of cwd
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const isProduction = process.env.NODE_ENV === "production";

// In production, a missing JWT secret is a hard error
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-only-change-me")) {
  throw new Error("JWT_SECRET must be set to a strong random value in production");
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongoUrl:
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/personal_finance_tracker",
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:4000/api/auth/google/callback"
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant"
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    globalMax: 300,
    authMax: 15
  },
  uploads: {
    maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
  }
};

module.exports = config;
