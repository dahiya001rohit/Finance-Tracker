const express = require("express");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const config = require("../config");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, signToken } = require("../middleware/auth");
const { badRequest, unauthorized } = require("../errors");
const User = require("../models/User");
const { serializeUser } = require("../utils/serialize");

const router = express.Router();

// Strict rate limiter on auth routes
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." }
});

const registerSchema = z.object({
  name:              z.string().min(2).max(100).trim(),
  email:             z.string().email().trim(),
  password:          z.string().min(8).max(128),
  preferredCurrency: z.string().length(3).default("INR")
});

const loginSchema = z.object({
  email:    z.string().email().trim(),
  password: z.string().min(1)
});

// ─── Google OAuth ────────────────────────────────────────────────────────────

if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL:  config.google.callbackUrl
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Google account has no email"));

          const avatarUrl = profile.photos?.[0]?.value || null;

          const existing = await User.findOne({
            $or: [{ googleId: profile.id }, { email: email.toLowerCase() }]
          });

          if (existing) {
            if (!existing.googleId) {
              existing.googleId = profile.id;
              existing.avatarUrl = existing.avatarUrl || avatarUrl;
              await existing.save();
            }
            return done(null, existing);
          }

          const created = await User.create({
            name:              profile.displayName || email,
            email:             email.toLowerCase(),
            googleId:          profile.id,
            preferredCurrency: "INR",
            avatarUrl
          });
          return done(null, created);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

// ─── Register ────────────────────────────────────────────────────────────────

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);

    try {
      const user = await User.create({
        name:              input.name,
        email:             input.email.toLowerCase(),
        passwordHash,
        preferredCurrency: input.preferredCurrency.toUpperCase()
      });

      res.status(201).json({ user: serializeUser(user), token: signToken(user) });
    } catch (error) {
      if (error.code === 11000) throw badRequest("Email is already registered");
      throw error;
    }
  })
);

// ─── Login ───────────────────────────────────────────────────────────────────

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() });

    if (!user?.passwordHash) throw unauthorized("Invalid email or password");

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password");

    res.json({ user: serializeUser(user), token: signToken(user) });
  })
);

// ─── Me ──────────────────────────────────────────────────────────────────────

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) throw unauthorized("User not found");
    res.json({ user: serializeUser(user) });
  })
);

// ─── Google OAuth flow ────────────────────────────────────────────────────────

router.get("/google", (req, res, next) => {
  if (!config.google.clientId) {
    return next(badRequest("Google OAuth is not configured"));
  }
  return passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${config.clientUrl}/login` }),
  (req, res) => {
    const token = signToken(req.user);
    res.redirect(`${config.clientUrl}?token=${token}`);
  }
);

module.exports = router;
