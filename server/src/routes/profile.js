const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { badRequest, unauthorized } = require("../errors");
const User = require("../models/User");
const { serializeUser } = require("../utils/serialize");

const router = express.Router();

const updateSchema = z.object({
  name:              z.string().min(2).max(100).trim().optional(),
  preferredCurrency: z.string().length(3).optional()
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(128)
});

// GET /api/profile
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) throw unauthorized("User not found");
    res.json({ user: serializeUser(user) });
  })
);

// PUT /api/profile
router.put(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const updates = {};
    if (input.name)              updates.name = input.name;
    if (input.preferredCurrency) updates.preferredCurrency = input.preferredCurrency.toUpperCase();

    const user = await User.findByIdAndUpdate(req.user.id, updates, { returnDocument: "after" });
    if (!user) throw unauthorized("User not found");
    res.json({ user: serializeUser(user) });
  })
);

// PUT /api/profile/password
router.put(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = passwordSchema.parse(req.body);
    const user = await User.findById(req.user.id);
    if (!user) throw unauthorized("User not found");

    if (!user.passwordHash) {
      throw badRequest("This account uses Google Sign-In and has no password to change");
    }

    const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!ok) throw unauthorized("Current password is incorrect");

    user.passwordHash = await bcrypt.hash(input.newPassword, 12);
    await user.save();

    res.json({ ok: true, message: "Password updated successfully" });
  })
);

module.exports = router;
