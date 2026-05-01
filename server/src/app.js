const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const { errorHandler } = require("./errors");

const authRoutes         = require("./routes/auth");
const profileRoutes      = require("./routes/profile");
const categoryRoutes     = require("./routes/categories");
const transactionRoutes  = require("./routes/transactions");
const budgetRoutes       = require("./routes/budgets");
const reportRoutes       = require("./routes/reports");
const notificationRoutes = require("./routes/notifications");
const currencyRoutes     = require("./routes/currencies");

const app = express();

// ─── Security ───────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc:    ["'self'", "https://fonts.gstatic.com"],
        imgSrc:     ["'self'", "data:", "blob:"],
        scriptSrc:  ["'self'"],
        connectSrc: ["'self'"]
      }
    }
  })
);

// ─── CORS ───────────────────────────────────────────────────────────────────
function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true); // non-browser / curl
  if (config.nodeEnv !== "production") {
    // In dev allow any localhost / 127.0.0.1 port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
  }
  if (origin === config.clientUrl) return callback(null, true);
  return callback(new Error(`CORS blocked: ${origin}`));
}
app.use(cors({ origin: corsOrigin, credentials: true }));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (config.nodeEnv !== "test") {
  app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
}

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ─── Passport ────────────────────────────────────────────────────────────────
app.use(passport.initialize());

// ─── Global rate limiter ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use("/api", globalLimiter);

// ─── Static uploads ──────────────────────────────────────────────────────────
app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), "server/uploads"), {
    maxAge: "7d",
    immutable: false
  })
);

// ─── Health ──────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "personal-finance-tracker", env: config.nodeEnv });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/profile",       profileRoutes);
app.use("/api/categories",    categoryRoutes);
app.use("/api/transactions",  transactionRoutes);
app.use("/api/budgets",       budgetRoutes);
app.use("/api/reports",       reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/currencies",    currencyRoutes);

// ─── SPA fallback in production ───────────────────────────────────────────────
if (config.nodeEnv === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
