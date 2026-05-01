const { ZodError } = require("zod");

// ─── Error factories ────────────────────────────────────────────────────────

function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const badRequest      = (msg) => createError(400, msg);
const unauthorized    = (msg) => createError(401, msg);
const forbidden       = (msg) => createError(403, msg);
const notFound        = (msg) => createError(404, msg);
const tooManyRequests = (msg) => createError(429, msg);
const internal        = (msg) => createError(500, msg || "Internal server error");

// ─── Global error handler middleware ────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const isDev = process.env.NODE_ENV !== "production";

  // Zod validation errors → 400 with per-field messages
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    return res.status(400).json({ error: messages });
  }

  // Mongoose cast error (bad ObjectId format)
  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ error: messages });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(400).json({ error: `${field} already exists` });
  }

  // Our own app errors with a status code
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Unknown server error — log it but don't leak the stack to the client
  if (isDev) {
    console.error("[error]", err);
  } else {
    console.error("[error]", err.message);
  }

  return res.status(500).json({ error: "Something went wrong. Please try again." });
}

module.exports = { badRequest, unauthorized, forbidden, notFound, tooManyRequests, internal, errorHandler };
