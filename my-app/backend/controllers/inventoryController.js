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
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ message: "businessId mungon" });
    }

    const bidObj = new mongoose.Types.ObjectId(businessId);

    const products = await Product.find({
      businessId: bidObj,
      categoryType: {
        $in: [
          "Ushqime",
          "Pije",
          "ushqime",
          "pije",
          "Bar",
          "Restorant",
          "bar",
          "restorant",
        ],
      },
    }).lean();

    const productMap = new Map();

    products.forEach((p) => {
      productMap.set(String(p._id), {
        productId: String(p._id),
        productName: p.nameSq || p.name || p.nameEn || p.nameIt || "Produkt",
        categoryType: p.categoryType,
        price: Number(p.price || 0),
        supplied: 0,
        sold: 0,
        remaining: 0,
      });
    });

    const supplies = await Supply.aggregate([
      { $match: { businessId: bidObj } },
      {
        $group: {
          _id: "$productId",
          supplied: { $sum: { $toDouble: "$qty" } },
        },
      },
    ]);

    supplies.forEach((s) => {
      const pid = String(s._id || "");
      if (productMap.has(pid)) {
        productMap.get(pid).supplied = Number(s.supplied || 0);
      }
    });

    const sales = await Order.aggregate([
      {
        $match: {
          businessId: bidObj,
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          sold: { $sum: { $toDouble: "$items.qty" } },
        },
      },
    ]);

    console.log("INVENTORY SALES:", sales);

    sales.forEach((s) => {
      const pid = String(s._id || "");
      if (productMap.has(pid)) {
        productMap.get(pid).sold = Number(s.sold || 0);
      }
    });

    const items = Array.from(productMap.values()).map((p) => ({
      ...p,
      remaining: Number(p.supplied || 0) - Number(p.sold || 0),
    }));

    return res.json({
      items,
      totalProductsWithSales: items.filter((x) => x.sold > 0).length,
      totalQuantitySold: items.reduce((sum, x) => sum + Number(x.sold || 0), 0),
    });
  } catch (err) {
    console.error("Gabim te getInventorySummary:", err);
    return res.status(500).json({
      message: "Gabim në server inventory",
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
      categoryType: {
  $in: [
    "Ushqime",
    "Pije",
    "ushqime",
    "pije",
  ],
},
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
