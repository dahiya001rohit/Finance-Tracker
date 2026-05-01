const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { badRequest, notFound } = require("../errors");
const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const { serializeCategory } = require("../utils/serialize");

const router = express.Router();

const categorySchema = z.object({
  name: z.string().min(2),
  kind: z.enum(["income", "expense", "investment", "refund"])
});

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const categories = await Category.find({
      userId: req.user.id,
      isDeleted: false
    }).sort({ kind: 1, name: 1 });
    res.json({ categories: categories.map(serializeCategory) });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = categorySchema.parse(req.body);
    try {
      const category = await Category.create({
        userId: req.user.id,
        name: input.name,
        kind: input.kind
      });
      res.status(201).json({ category: serializeCategory(category) });
    } catch (error) {
      if (error.code === 11000) throw badRequest("Category already exists");
      throw error;
    }
  })
);

router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = categorySchema.parse(req.body);
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, isDeleted: false },
      { name: input.name, kind: input.kind },
      { new: true }
    );
    if (!category) throw notFound("Category not found");
    res.json({ category: serializeCategory(category) });
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const count = await Transaction.countDocuments({
      categoryId: req.params.id,
      userId: req.user.id
    });

    if (count > 0) {
      const category = await Category.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { isDeleted: true },
        { new: true }
      );
      if (!category) throw notFound("Category not found");
      return res.json({
        deleted: true,
        softDeleted: true,
        message: "Category archived because it has existing transactions"
      });
    }

    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!category) throw notFound("Category not found");
    res.json({ deleted: true, softDeleted: false });
  })
);

module.exports = router;
