// backend/controllers/inventoryController.js
import mongoose from "mongoose";
import Supply from "../models/Supply.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const toStr = (v) => String(v ?? "").trim();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

// YYYY-MM-DD -> Date (UTC start/end)
const parseYmdStartUTC = (ymd) => {
  const s = toStr(ymd);
  if (!s) return null;
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
};

const parseYmdEndUTC = (ymd) => {
  const s = toStr(ymd);
  if (!s) return null;
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
};

const stockableName = (p) =>
  toStr(p?.nameSq || p?.name || p?.nameEn || p?.nameIt);

export const getInventorySummary = async (req, res) => {
  console.log("📦 [GET] /api/inventory/summary", req.query);

  try {
    const { businessId, from, to } = req.query;

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }
    if (!isValidId(businessId)) {
      return res.status(400).json({ message: "businessId jo i vlefshëm" });
    }

    const bidObj = new mongoose.Types.ObjectId(businessId);
    const bidStr = toStr(businessId);

    /* ===============================
       1) DATE FILTER (opsional)
    =============================== */
    const createdAtFilter = {};
    const start = from ? parseYmdStartUTC(from) : null;
    if (from && !start) {
      return res.status(400).json({
        message: "Format i pasaktë 'from'. Përdor YYYY-MM-DD.",
      });
    }
    if (start) createdAtFilter.$gte = start;

    const end = to ? parseYmdEndUTC(to) : null;
    if (to && !end) {
      return res.status(400).json({
        message: "Format i pasaktë 'to'. Përdor YYYY-MM-DD.",
      });
    }
    if (end) createdAtFilter.$lte = end;

    const hasDateFilter = Object.keys(createdAtFilter).length > 0;

    /* ===============================
       2) STOCKABLE PRODUCTS (ushqime/pije) + price
    =============================== */
    const stockableProducts = await Product.find(
      { businessId: bidObj, categoryType: { $in: ["ushqime", "pije"] } },
      { name: 1, nameSq: 1, nameEn: 1, nameIt: 1, categoryType: 1, price: 1 }
    ).lean();

    if (!stockableProducts.length) {
      return res.json({
        items: [],
        totalProductsWithSales: 0,
        totalQuantitySold: 0,
      });
    }

    const productById = new Map(stockableProducts.map((p) => [String(p._id), p]));

    // legacy: emra të lejuar (fallback kur orders/supplies janë by name)
    const stockableNames = new Set();
    for (const p of stockableProducts) {
      const n = stockableName(p);
      if (n) stockableNames.add(n);

      // ruaj edhe variantet nëse ekzistojnë
      const n1 = toStr(p?.name);
      const n2 = toStr(p?.nameSq);
      const n3 = toStr(p?.nameEn);
      const n4 = toStr(p?.nameIt);
      if (n1) stockableNames.add(n1);
      if (n2) stockableNames.add(n2);
      if (n3) stockableNames.add(n3);
      if (n4) stockableNames.add(n4);
    }

    /* ===============================
       3) SUPPLIES
       - i RI: businessId ObjectId + productId
       - fallback legacy: businessId string + productName (vetëm nëse s’ka data byId)
    =============================== */
    const supplyMatchNew = { businessId: bidObj };
    const supplyMatchLegacy = { businessId: bidStr };

    if (hasDateFilter) {
      supplyMatchNew.createdAt = createdAtFilter;
      supplyMatchLegacy.createdAt = createdAtFilter;
    }

    const suppliesById = await Supply.aggregate([
      { $match: supplyMatchNew },
      {
        $group: {
          _id: "$productId",
          totalQuantitySupplied: { $sum: "$qty" },
        },
      },
    ]);

    const supplyMapById = new Map();
    for (const s of suppliesById) {
      const pid = String(s?._id || "");
      if (!pid) continue;
      if (!productById.has(pid)) continue;
      supplyMapById.set(pid, s.totalQuantitySupplied || 0);
    }

    // fallback legacy vetëm kur s’ka asnjë supply byId
    const supplyMapByName = new Map();
    if (supplyMapById.size === 0) {
      const suppliesByName = await Supply.aggregate([
        { $match: supplyMatchLegacy },
        {
          $group: {
            _id: "$productName",
            totalQuantitySupplied: { $sum: "$qty" },
          },
        },
      ]);

      for (const s of suppliesByName) {
        const name = toStr(s?._id);
        if (!name) continue;
        if (!stockableNames.has(name)) continue;
        supplyMapByName.set(name, s.totalQuantitySupplied || 0);
      }
    }

    /* ===============================
       4) SALES (Order) – momentalisht by items.name
    =============================== */
    const orderMatch = { businessId: bidObj };
    if (hasDateFilter) orderMatch.createdAt = createdAtFilter;

    const sales = await Order.aggregate([
      { $match: orderMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalQuantitySold: { $sum: "$items.qty" },
        },
      },
    ]);

    const soldMapByName = new Map();
    for (const sale of sales) {
      const name = toStr(sale?._id);
      if (!name) continue;
      if (!stockableNames.has(name)) continue;
      soldMapByName.set(name, sale.totalQuantitySold || 0);
    }

    /* ===============================
       5) MERGE
    =============================== */
    const result = [];

    for (const [pid, p] of productById.entries()) {
      const displayName = stockableName(p);

      const supplied =
        supplyMapById.get(pid) ??
        supplyMapByName.get(displayName) ??
        0;

      const sold = soldMapByName.get(displayName) ?? 0;

      result.push({
        productId: pid,
        productName: displayName,
        categoryType: p.categoryType,
        price: p.price ?? 0,
        supplied,
        sold,
        remaining: supplied - sold,
      });
    }

    return res.json({
      items: result,
      totalProductsWithSales: result.filter((r) => r.sold > 0).length,
      totalQuantitySold: result.reduce((sum, r) => sum + (r.sold || 0), 0),
    });
  } catch (err) {
    console.error("❌ Gabim te getInventorySummary:", err);
    return res.status(500).json({
      message: "Gabim në server (inventory)",
      error: err.message,
    });
  }
};

// POST /api/inventory/supply
// ✅ Ruhet supply (qty, unitPrice) + opsional update Product.price (newPrice)
export const addSupply = async (req, res) => {
  try {
    const { businessId, productId, qty, unitPrice = 0, newPrice, note = "" } = req.body;

    if (!businessId || !productId || qty == null) {
      return res.status(400).json({
        message: "businessId, productId dhe qty janë të detyrueshme",
      });
    }

    if (!isValidId(businessId)) {
      return res.status(400).json({ message: "businessId jo i vlefshëm" });
    }
    if (!isValidId(productId)) {
      return res.status(400).json({ message: "productId jo i vlefshëm" });
    }

    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      return res.status(400).json({ message: "qty duhet të jetë > 0" });
    }

    const up = Number(unitPrice);
    const safeUnitPrice = Number.isFinite(up) && up >= 0 ? up : 0;

    const bid = new mongoose.Types.ObjectId(businessId);
    const pid = new mongoose.Types.ObjectId(productId);

    // ✅ vetëm ushqime/pije
    const product = await Product.findOne({
      _id: pid,
      businessId: bid,
      categoryType: { $in: ["ushqime", "pije"] },
    })
      .select("_id name nameSq nameEn nameIt")
      .lean();

    if (!product) {
      return res.status(404).json({
        message: "Produkti nuk ekziston ose nuk lejohet në inventar.",
      });
    }

    const displayName = stockableName(product);

    const supply = await Supply.create({
      businessId: bid,
      productId: pid,
      productName: displayName,
      qty: q,
      unitPrice: safeUnitPrice,
      note: toStr(note),
    });

    // ✅ Update çmimin e produktit (shitje) vetëm nëse është dhënë
    if (newPrice !== undefined && newPrice !== null && newPrice !== "") {
      const np = Number(newPrice);
      if (!Number.isFinite(np) || np < 0) {
        return res.status(400).json({ message: "newPrice duhet të jetë numër >= 0" });
      }

      await Product.updateOne(
        { _id: pid, businessId: bid },
        { $set: { price: np } }
      );
    }

    return res.status(201).json({
      ok: true,
      supplyId: supply._id,
      supply,
    });
  } catch (err) {
    console.error("❌ Gabim te addSupply:", err);
    return res.status(500).json({
      message: "Gabim në server (addSupply)",
      error: err.message,
    });
  }
};
