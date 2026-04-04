import Product from "../models/Product.js";
import mongoose from "mongoose";

/* =======================
   HELPERS
======================= */
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const readBusinessId = (req) => {
  const q = req?.query ?? {};
  const b = req?.body ?? {};
  const p = req?.params ?? {};
  return q.businessId || b.businessId || p.businessId;
};


const emitProductsChanged = (req, businessId) => {
  const io = req.app.get("io");
  io?.to(`business:${businessId}`).emit("products:changed", { businessId });
};

const normalizeStr = (v) => String(v ?? "").trim();
const normalizeLower = (v) => normalizeStr(v).toLowerCase();

const requiresSubCategory = (categoryType) => {
  const ct = normalizeLower(categoryType);
  return ct === "pije" || ct === "ushqime";
};

const SUBCAT_MARKER_NAME = "__subcat__";

/* ============================================================
   GET /api/products?businessId=...&categoryType=...&subCategory=...
============================================================ */
export const getProducts = async (req, res) => {
  try {
     console.log("REQ CHECK:", {
      hasReq: !!req,
      hasQuery: !!req?.query,
      method: req?.method,
      url: req?.originalUrl,
    });
    const { categoryType, subCategory } = req.query;
    const businessId = readBusinessId(req);

    if (!businessId || !isValidId(businessId)) {
      return res.json([]);
    }

    const filter = {
      businessId: new mongoose.Types.ObjectId(businessId),

      // ✅ vetëm produkte me kategori (jo legacy)
      categoryType: { $exists: true, $ne: null, $ne: "" },

      // ✅ mos kthe placeholder-a gabimisht
      name: { $ne: SUBCAT_MARKER_NAME },
    };

    if (categoryType) filter.categoryType = normalizeStr(categoryType);
    if (subCategory) filter.subCategory = normalizeStr(subCategory);

    // ✅ hide "Numrat" për cadra/dhoma kur hideNumbers=1
const hideNumbers = String(req.query.hideNumbers || "") === "1";

if (hideNumbers) {
  filter.$or = [
    { categoryType: { $nin: ["cadra", "dhoma"] } },
    { subCategory: { $ne: "Numrat" } },
  ];
}


    const products = await Product.find(filter).sort({ name: 1 }).lean();
    return res.json(products);
  } catch (err) {
    console.error("❌ Gabim te getProducts:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================================================
   POST /api/products
============================================================ */
export const createProduct = async (req, res) => {
  try {
    const businessId = readBusinessId(req);
    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    const ct = normalizeStr(req.body.categoryType);
    if (!ct) {
      return res.status(400).json({ message: "categoryType është i detyrueshëm" });
    }

    const sc = normalizeStr(req.body.subCategory);

    // ✅ detyro subCategory për pije/ushqime
    if (requiresSubCategory(ct) && !sc) {
      return res
        .status(400)
        .json({ message: "subCategory është e detyrueshme për Pije/Ushqime" });
    }

    // ✅ multi-language fields
    const nameSq = normalizeStr(req.body.nameSq);
    const nameEn = normalizeStr(req.body.nameEn);
    const nameIt = normalizeStr(req.body.nameIt);

    const descSq = normalizeStr(req.body.descSq);
    const descEn = normalizeStr(req.body.descEn);
    const descIt = normalizeStr(req.body.descIt);

    // ✅ fallback name: prefer Sq, pastaj name, pastaj En/It
    const cleanName =
      nameSq || normalizeStr(req.body.name) || nameEn || nameIt;

    if (!cleanName) {
      return res.status(400).json({ message: "name është i detyrueshëm" });
    }

    if (cleanName.toLowerCase() === SUBCAT_MARKER_NAME) {
      return res.status(400).json({ message: "Emër produkti i pavlefshëm." });
    }

    // ✅ destination (kuzhine/banak)
    const destinationRaw = normalizeLower(req.body.destination);
    const destination =
      destinationRaw === "banak" ? "banak" : "kuzhine";

    // ✅ price (kujdes për cadra/dhoma numrat)
    const priceRaw = req.body.price;

    // Nëse do lejohet null për numra, mos e detyro këtu.
    // Por me schema aktuale (price required) duhet numër:
    const numericPrice = Number(priceRaw);
    if (Number.isNaN(numericPrice)) {
      return res.status(400).json({ message: "price duhet të jetë numër" });
    }

    const product = await Product.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      categoryType: ct,
      subCategory: sc || undefined,
      destination,

      name: cleanName,
      nameSq,
      nameEn,
      nameIt,

      descSq,
      descEn,
      descIt,

      price: numericPrice,
    });

    emitProductsChanged(req, businessId);
    return res.status(201).json(product);
  } catch (err) {
    console.error("❌ Gabim te createProduct:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================================================
   PUT /api/products/:id?businessId=...
============================================================ */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = readBusinessId(req);

    if (!isValidId(id)) {
      return res.status(400).json({ message: "id i pavlefshëm" });
    }
    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    const patch = { ...req.body };
    delete patch.businessId;

    // ✅ mos lejo të bëhet "__subcat__" me update
    if (patch.name !== undefined) {
      const cleanName = normalizeStr(patch.name);
      if (!cleanName) return res.status(400).json({ message: "name nuk mund të jetë bosh" });
      if (cleanName.toLowerCase() === SUBCAT_MARKER_NAME) {
        return res.status(400).json({ message: "Emër produkti i pavlefshëm." });
      }
      patch.name = cleanName;
    }

    if (patch.price !== undefined) {
      const numericPrice = Number(patch.price);
      if (Number.isNaN(numericPrice)) {
        return res.status(400).json({ message: "price duhet të jetë numër" });
      }
      patch.price = numericPrice;
    }

    if (patch.categoryType !== undefined) {
      patch.categoryType = patch.categoryType ? normalizeStr(patch.categoryType) : undefined;
    }

    if (patch.subCategory !== undefined) {
      patch.subCategory = patch.subCategory ? normalizeStr(patch.subCategory) : undefined;
    }

    // ✅ merr produktin aktual që të dimë categoryType final
    const current = await Product.findOne({
      _id: id,
      businessId: new mongoose.Types.ObjectId(businessId),
    }).lean();

    if (!current) {
      return res.status(404).json({ message: "Produkti nuk u gjet për këtë biznes" });
    }

    const finalCategoryType = normalizeStr(patch.categoryType ?? current.categoryType);

    // ✅ për pije/ushqime: mos lejo subCategory bosh
    if (requiresSubCategory(finalCategoryType)) {
      const finalSub = patch.subCategory !== undefined ? patch.subCategory : current.subCategory;
      if (!normalizeStr(finalSub)) {
        return res
          .status(400)
          .json({ message: "subCategory nuk mund të jetë bosh për Pije/Ushqime" });
      }
    }
    // ✅ trim për multi-language fields


    if (patch.nameSq !== undefined) patch.nameSq = normalizeStr(patch.nameSq);
    if (patch.nameEn !== undefined) patch.nameEn = normalizeStr(patch.nameEn);
    if (patch.nameIt !== undefined) patch.nameIt = normalizeStr(patch.nameIt);
    if (patch.descSq !== undefined) patch.descSq = normalizeStr(patch.descSq);
    if (patch.descEn !== undefined) patch.descEn = normalizeStr(patch.descEn);
    if (patch.descIt !== undefined) patch.descIt = normalizeStr(patch.descIt);

// ✅ destination
if (patch.destination !== undefined) {
  patch.destination = normalizeLower(patch.destination) === "banak" ? "banak" : "kuzhine";
}

// ✅ fallback name: nëse po ndryshon nameSq dhe s’po dërgon name, vendose name = nameSq
if (patch.name === undefined && patch.nameSq) {
  patch.name = patch.nameSq;
}


    const updated = await Product.findOneAndUpdate(
      {
        _id: id,
        businessId: new mongoose.Types.ObjectId(businessId),
      },
      patch,
      { new: true }
    );

    emitProductsChanged(req, businessId);
    return res.json(updated);
  } catch (err) {
    console.error("❌ Gabim te updateProduct:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================================================
   DELETE /api/products/:id?businessId=...
============================================================ */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = readBusinessId(req);

    if (!isValidId(id)) {
      return res.status(400).json({ message: "id i pavlefshëm" });
    }
    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }

    const deleted = await Product.findOneAndDelete({
      _id: id,
      businessId: new mongoose.Types.ObjectId(businessId),
    });

    if (!deleted) {
      return res.status(404).json({ message: "Produkti nuk u gjet për këtë biznes" });
    }

    emitProductsChanged(req, businessId);
    return res.json({ success: true, id: deleted._id });
  } catch (err) {
    console.error("❌ Gabim te deleteProduct:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
  
};

/* ============================================================
   DELETE CATEGORY (soft delete)
   DELETE /api/products/category?businessId=...&categoryType=...
============================================================ */
export const deleteCategoryFromProducts = async (req, res) => {
  try {
    const businessId = readBusinessId(req);
    const { categoryType } = req.query;

    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }
    if (!categoryType || !normalizeStr(categoryType)) {
      return res.status(400).json({ message: "categoryType mungon" });
    }

    const result = await Product.updateMany(
      {
        businessId: new mongoose.Types.ObjectId(businessId),
        categoryType: normalizeStr(categoryType),
      },
      { $unset: { categoryType: "", subCategory: "" } }
    );

    emitProductsChanged(req, businessId);
    return res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    console.error("❌ Gabim te deleteCategoryFromProducts:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================================================
   DELETE SUBCATEGORY (soft delete)
   DELETE /api/products/subcategory?businessId=...&categoryType=...&subCategory=...
============================================================ */
export const deleteSubCategoryFromProducts = async (req, res) => {
  try {
    const businessId = readBusinessId(req);
    const { categoryType, subCategory } = req.query;

    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({ message: "businessId i pavlefshëm" });
    }
    if (!categoryType || !normalizeStr(categoryType)) {
      return res.status(400).json({ message: "categoryType mungon" });
    }
    if (!subCategory || !normalizeStr(subCategory)) {
      return res.status(400).json({ message: "subCategory mungon" });
    }

    const result = await Product.updateMany(
      {
        businessId: new mongoose.Types.ObjectId(businessId),
        categoryType: normalizeStr(categoryType),
        subCategory: normalizeStr(subCategory),
      },
      { $unset: { subCategory: "" } }
    );

    emitProductsChanged(req, businessId);
    return res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    console.error("❌ Gabim te deleteSubCategoryFromProducts:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};
