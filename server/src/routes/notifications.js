const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { notFound } = require("../errors");
const Notification = require("../models/Notification");
const { serializeNotification } = require("../utils/serialize");

const router = express.Router();

// GET /api/notifications
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ notifications: notifications.map(serializeNotification) });
  })
);

// PATCH /api/notifications/:id/read — mark single notification as read
router.patch(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { returnDocument: "after" }
    );
    if (!notification) throw notFound("Notification not found");
    res.json({ notification: serializeNotification(notification) });
  })
);

// PATCH /api/notifications/read-all — mark all as read
router.patch(
  "/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ ok: true });
  })
);

// DELETE /api/notifications — clear all notifications for user
router.delete(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ ok: true, message: "All notifications cleared" });
  })
);

module.exports = router;
