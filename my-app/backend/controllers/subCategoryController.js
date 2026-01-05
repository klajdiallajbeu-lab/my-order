import mongoose from "mongoose";
import SubCategory from "../models/SubCategory.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const norm = (v) => String(v || "").trim();

const normalizeDestination = (d) => {
  const x = norm(d).toLowerCase();
  return x === "banak" ? "banak" : "kuzhine"; // default kuzhine
};

export const getSubCategories = async (req, res) => {
  try {
    const { businessId, categoryType } = req.query;

    if (!businessId || !isValidId(businessId)) return res.json([]);

    const filter = { businessId };
    if (categoryType) filter.categoryType = norm(categoryType).toLowerCase();

    // ✅ nëse ke multi-lingual (nameSq) e sorton në fillim, përndryshe s’bën dëm
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

      // multi-lingual (opsionale)
      nameSq,
      nameEn,
      nameIt,

      // fallback
      name,

      // ✅ NEW (kuzhine/banak)
      destination,
    } = req.body;

    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    const ct = norm(categoryType).toLowerCase();
    if (!ct) return res.status(400).json({ message: "categoryType mungon" });

    const sq = norm(nameSq || name);
    if (!sq) return res.status(400).json({ message: "name mungon" });

    const row = await SubCategory.create({
      businessId,
      categoryType: ct,

      // ✅ ruaj multi + fallback (nëse modeli yt i ka këto fusha)
      nameSq: sq,
      nameEn: norm(nameEn),
      nameIt: norm(nameIt),
      name: sq,

      // ✅ ku shkon porosia
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

    if (!isValidId(id)) return res.status(400).json({ message: "id i pavlefshëm" });
    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    const { nameSq, nameEn, nameIt, name, destination } = req.body || {};

    const sq = norm(nameSq || name);
    if (!sq) return res.status(400).json({ message: "name mungon" });

    const update = {
      nameSq: sq,
      nameEn: norm(nameEn),
      nameIt: norm(nameIt),
      name: sq,
    };

    // ✅ update destination vetëm nëse vjen nga frontend
    if (destination !== undefined) {
      update.destination = normalizeDestination(destination);
    }

    const updated = await SubCategory.findOneAndUpdate(
      { _id: id, businessId },
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Nuk u gjet" });

    return res.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Kjo nën-kategori ekziston tashmë." });
    }
    console.error("❌ updateSubCategory:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.query;

    if (!isValidId(id)) return res.status(400).json({ message: "id i pavlefshëm" });
    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    const deleted = await SubCategory.findOneAndDelete({ _id: id, businessId }).lean();
    if (!deleted) return res.status(404).json({ message: "Nuk u gjet" });

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ deleteSubCategory:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};
