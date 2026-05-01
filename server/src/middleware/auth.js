const jwt = require("jsonwebtoken");
const config = require("../config");
const { unauthorized } = require("../errors");

function signToken(user) {
  return jwt.sign(
    { sub: user.id || user._id?.toString(), email: user.email },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(unauthorized());
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (error) {
    return next(unauthorized("Invalid or expired token"));
  }
}

module.exports = { requireAuth, signToken };
