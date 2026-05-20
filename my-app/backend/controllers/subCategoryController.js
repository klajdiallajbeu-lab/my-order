import mongoose from "mongoose";
import SubCategory from "../models/SubCategory.js";
import Product from "../models/Product.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const norm = (v) => String(v || "").trim();

const normalizeDestination = (d) => {
  const x = norm(d).toLowerCase();
  return x === "banak" ? "banak" : "kuzhine";
};

const normalizeCategoryType = (v) => norm(v).toLowerCase();

export const getSubCategories = async (req, res) => {
  try {
    const { businessId, categoryType } = req.query;

    if (!businessId || !isValidId(businessId)) {
      return res.json([]);
    }

    const filter = {
      businessId: new mongoose.Types.ObjectId(businessId),
    };

    if (categoryType) {
      filter.categoryType = normalizeCategoryType(categoryType);
    }

    const rows = await SubCategory.find(filter)
      .sort({ nameSq: 1, name: 1, createdAt: -1 })
      .lean();

    return res.json(rows);
  } catch (err) {
    console.error("❌ getSubCategories:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

export const createSubCategory = async (req, res) => {
  try {
    const {
      businessId,
      categoryType,
      nameSq,
      nameEn,
      nameIt,
      name,
      destination,
    } = req.body || {};

    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    const ct = normalizeCategoryType(categoryType);
    if (!ct) {
      return res.status(400).json({ message: "categoryType mungon" });
    }

    const sq = norm(nameSq || name);
    if (!sq) {
      return res.status(400).json({ message: "name mungon" });
    }

    const row = await SubCategory.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      categoryType: ct,
      nameSq: sq,
      nameEn: norm(nameEn),
      nameIt: norm(nameIt),
      name: sq,
      destination: normalizeDestination(destination),
    });

    return res.status(201).json(row);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Kjo nën-kategori ekziston tashmë." });
    }

    console.error("❌ createSubCategory:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.query;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "id i pavlefshëm" });
    }

    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    const { nameSq, nameEn, nameIt, name, destination } = req.body || {};

    const sq = norm(nameSq || name);
    if (!sq) {
      return res.status(400).json({ message: "name mungon" });
    }

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const subCategoryObjectId = new mongoose.Types.ObjectId(id);

    // 1. gjej nën-kategorinë aktuale
    const current = await SubCategory.findOne({
      _id: subCategoryObjectId,
      businessId: businessObjectId,
    }).lean();

    if (!current) {
      return res.status(404).json({ message: "Nuk u gjet" });
    }

    const oldNameSq = norm(current.nameSq);
    const oldName = norm(current.name);

    // 2. update nën-kategorinë
    const update = {
      nameSq: sq,
      nameEn: norm(nameEn),
      nameIt: norm(nameIt),
      name: sq,
    };

    if (destination !== undefined) {
      update.destination = normalizeDestination(destination);
    }

    const updated = await SubCategory.findOneAndUpdate(
      {
        _id: subCategoryObjectId,
        businessId: businessObjectId,
      },
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Nuk u gjet" });
    }

    // 3. përditëso produktet ekzistuese
    // - ato që kanë subCategoryId = kjo nën-kategori
    // - ose ato të vjetra që kanë subCategory me emrin e vjetër
    await Product.updateMany(
      {
        businessId: businessObjectId,
        categoryType: current.categoryType,
        $or: [
          { subCategoryId: subCategoryObjectId },
          { subCategory: oldNameSq },
          { subCategory: oldName },
        ],
      },
      {
        $set: {
          subCategoryId: subCategoryObjectId,
          subCategory: sq,
        },
      }
    );

    return res.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Kjo nën-kategori ekziston tashmë." });
    }

    console.error("❌ updateSubCategory:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.query;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "id i pavlefshëm" });
    }

    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    const subCategoryObjectId = new mongoose.Types.ObjectId(id);
    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    const deleted = await SubCategory.findOneAndDelete({
      _id: subCategoryObjectId,
      businessId: businessObjectId,
    }).lean();

    if (!deleted) {
      return res.status(404).json({ message: "Nuk u gjet" });
    }

    // ✅ pastro lidhjen te produktet që e përdorin këtë subkategori
    await Product.updateMany(
      {
        businessId: businessObjectId,
        subCategoryId: subCategoryObjectId,
      },
      {
        $unset: {
          subCategoryId: "",
          subCategory: "",
        },
      }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ deleteSubCategory:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};