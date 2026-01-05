// backend/controllers/inventoryController.js
import mongoose from "mongoose";
import Supply from "../models/Supply.js";
import Order from "../models/Order.js";

// GET /api/inventory/summary?businessId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export const getInventorySummary = async (req, res) => {
  console.log("📦 [GET] /api/inventory/summary", req.query);

  try {
    const { businessId, from, to } = req.query;

    // 1) VALIDIM BAZË
    if (!businessId) {
      return res
        .status(400)
        .json({ message: "businessId është i detyrueshëm" });
    }

    // 2) FILTRI I DATAVE (opsional)
    const createdAtFilter = {};
    if (from && to) {
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T23:59:59`);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          message:
            "Format i pasaktë date. Përdor YYYY-MM-DD për 'from' dhe 'to'.",
        });
      }

      createdAtFilter.$gte = start;
      createdAtFilter.$lte = end;
    }

    // 3) FURNIZIMET (Supply) – businessId KËTU është STRING
    const supplyMatch = { businessId }; // string
    if (from && to) {
      supplyMatch.createdAt = createdAtFilter;
    }

    const supplies = await Supply.aggregate([
      { $match: supplyMatch },
      {
        $group: {
          _id: "$productName",
          totalQuantitySupplied: { $sum: "$qty" }, // ⚠️ KETU PËRDORIM qty
        },
      },
    ]);

// 4) SHITJET (Order)
// businessId te Order.js është ObjectId, por për siguri provojmë si ObjectId DHE si string
const orderMatch = {};
if (mongoose.Types.ObjectId.isValid(businessId)) {
  // nëse është ObjectId i vlefshëm → kërko me ObjectId
  orderMatch.businessId = new mongoose.Types.ObjectId(businessId);
} else {
  // për raste kur mund të jetë ruajtur si string
  orderMatch.businessId = businessId;
}

if (from && to) {
  orderMatch.createdAt = createdAtFilter;
}

const sales = await Order.aggregate([
  { $match: orderMatch },
  { $unwind: "$items" },
  {
    $group: {
      _id: "$items.name",                // emri i produktit nga Order.js
      totalQuantitySold: { $sum: "$items.qty" }, // qty nga Order.js
    },
  },
]);



    // 5) MAP I FURNIZIMEVE SIPAS PRODUKTIT
    const supplyMap = {};
    supplies.forEach((s) => {
      if (!s._id) return;
      supplyMap[s._id] = s.totalQuantitySupplied || 0;
    });

    // 6) BASHKIMI: SHITJE + FURNIZIME
    const result = sales.map((sale) => {
      const name = sale._id;
      const sold = sale.totalQuantitySold || 0;
      const supplied =
        supplyMap[name] != null ? supplyMap[name] : sold; // nëse s’kemi furnizim, supozojmë supplied = sold
      const remaining = supplied - sold;

      return {
        productName: name,
        supplied,
        sold,
        remaining,
      };
    });

    // 7) SHTO PRODUKTET QË JANË FURNIZUAR POR S’JANË SHITUR FARE
    Object.keys(supplyMap).forEach((name) => {
      const exists = result.find((r) => r.productName === name);
      if (!exists) {
        result.push({
          productName: name,
          supplied: supplyMap[name],
          sold: 0,
          remaining: supplyMap[name],
        });
      }
    });

    // 8) KTHE REZULTATIN
    return res.json({
      items: result,
      totalProductsWithSales: result.filter((r) => r.sold > 0).length,
      totalQuantitySold: result.reduce((sum, r) => sum + r.sold, 0),
    });
  } catch (err) {
    console.error("❌ Gabim te getInventorySummary:", err);
    return res
      .status(500)
      .json({ message: "Gabim në server (inventory)", error: err.message });
  }
};
export const addSupply = async (req, res) => {
  try {
    const { businessId, productName, qty, unitPrice, note } = req.body;

    if (!businessId || !productName || qty == null) {
      return res.status(400).json({
        message: "businessId, productName dhe qty janë të detyrueshme",
      });
    }

    if (qty <= 0) {
      return res.status(400).json({ message: "qty duhet të jetë > 0" });
    }

    const supply = await Supply.create({
      businessId,                         // STRING sipas Supply.js
      productName: productName.trim(),
      qty,
      unitPrice: unitPrice || 0,
      note: note || "",
    });

    return res.status(201).json(supply);
  } catch (err) {
    console.error("❌ Gabim te addSupply:", err);
    return res
      .status(500)
      .json({ message: "Gabim në server (addSupply)", error: err.message });
  }
};
