import mongoose from "mongoose";
import Category from "../models/Category.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ============================================================
   GET /api/categories?businessId=...
============================================================ */
export const getCategories = async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId || !isValidId(businessId)) {
      return res.json([]);
    }

    const categories = await Category.find({ businessId })
      .sort({ name: 1 })
      .lean();

    return res.json(categories);
  } catch (err) {
    console.error("❌ Gabim te getCategories:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================================================
   POST /api/categories
   body: { businessId, name }
============================================================ */
export const createCategory = async (req, res) => {
  try {
    const { businessId, name } = req.body;

    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "name është i detyrueshëm" });
    }

    const category = await Category.create({
      businessId,
      name: String(name).trim(),
    });

    return res.status(201).json(category);
  } catch (err) {
    console.error("❌ Gabim te createCategory:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================================================
   DELETE /api/categories/:id?businessId=...
============================================================ */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.query;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "id i pavlefshëm" });
    }
    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    const deleted = await Category.findOneAndDelete({
      _id: id,
      businessId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Category nuk u gjet" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Gabim te deleteCategory:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};
