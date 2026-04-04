// backend/controllers/statsController.js
import mongoose from "mongoose";
import Order from "../models/Order.js";

const makeDateRange = (from, to) => {
  const range = {};
  if (from) range.$gte = new Date(from + "T00:00:00");
  if (to) range.$lte = new Date(to + "T23:59:59");
  return Object.keys(range).length ? range : null;
};

const asObjectId = (id) => new mongoose.Types.ObjectId(id);

/* ============================
   GET /api/stats/period
   ?businessId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
============================ */
export const getPeriodStats = async (req, res) => {
  try {
    const { businessId, from, to } = req.query;

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.json({ totalRevenue: 0, orderCount: 0, byDay: [] });
    }

    const match = { businessId: asObjectId(businessId) };
    const dateRange = makeDateRange(from, to);
    if (dateRange) match.createdAt = dateRange;

    // Totali + numri i porosive
    const agg = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ["$totalALL", 0] } },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const stats = agg[0] || { totalRevenue: 0, orderCount: 0 };

    // By day për grafikun
const byDayAgg = await Order.aggregate([
  { $match: match },
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
      },
      total: { $sum: { $ifNull: ["$totalALL", 0] } },
    },
  },
  { $sort: { _id: 1 } },
]);

    const byDay = byDayAgg.map((d) => ({
      date: d._id,
      total: Number(d.total || 0),
    }));

    res.json({
      totalRevenue: Number(stats.totalRevenue || 0),
      orderCount: Number(stats.orderCount || 0),
      byDay,
    });
  } catch (err) {
    console.error("❌ Gabim te getPeriodStats:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================
   GET /api/stats/top-products
   ?businessId=...&from=...&to=...&limit=5
   ✅ Renditje sipas SASISË (qty)
============================ */
export const getTopProducts = async (req, res) => {
  try {
    const { businessId, from, to, limit = 5 } = req.query;

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }
    if (!mongoose.Types.ObjectId.isValid(businessId)) return res.json([]);

    const match = { businessId: asObjectId(businessId) };
    const dateRange = makeDateRange(from, to);
    if (dateRange) match.createdAt = dateRange;

    const agg = await Order.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name", // ose "$items.productId" nëse e ke korrekt
          qty: { $sum: { $ifNull: ["$items.qty", 0] } },
          revenue: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.qty", 0] },
                { $ifNull: ["$items.price", 0] },
              ],
            },
          },
        },
      },
      // ✅ rendit sipas qty (më e shitura -> më pak e shitura)
      { $sort: { qty: -1, revenue: -1 } },
      { $limit: Number(limit) },
    ]);

    const result = agg.map((p) => ({
      name: p._id || "Pa emër",
      qty: Number(p.qty || 0),
      revenue: Number(p.revenue || 0),
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ Gabim te getTopProducts:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================
   GET /api/stats/waiters
   ?businessId=...&from=...&to=...

   ✅ Kthen:
   {
     waiters: [{ waiterName, orderCount, totalRevenue }],
     rooms: { label: "Dhoma", orderCount, totalRevenue },
     umbrellas: { label: "Cadra", orderCount, totalRevenue }
   }

   ✅ Kamarjerët = vetëm "tavoline"
   ✅ Dhoma/Cadra = totals më vete (nuk hyjnë te kamarjeri)
============================ */
export const getWaiterStats = async (req, res) => {
  try {
    const { businessId, from, to } = req.query;

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.json({
        waiters: [],
        rooms: { label: "Dhoma", orderCount: 0, totalRevenue: 0 },
        umbrellas: { label: "Cadra", orderCount: 0, totalRevenue: 0 },
      });
    }

    const match = { businessId: asObjectId(businessId) };
    const dateRange = makeDateRange(from, to);
    if (dateRange) match.createdAt = dateRange;

    const [faceted] = await Order.aggregate([
      { $match: match },
      {
        $facet: {
          // ✅ vetëm tavolinat i atribuohen kamarjerit
          waiters: [
            { $match: { sourceType: "tavoline" } },
            {
              $group: {
                _id: { $ifNull: ["$createdBy", "Pa emër"] },
                orderCount: { $sum: 1 },
                totalRevenue: { $sum: { $ifNull: ["$totalALL", 0] } },
              },
            },
            { $sort: { totalRevenue: -1 } },
          ],

          // ✅ dhomat total (një rresht)
          rooms: [
            { $match: { sourceType: "dhoma" } },
            {
              $group: {
                _id: null,
                orderCount: { $sum: 1 },
                totalRevenue: { $sum: { $ifNull: ["$totalALL", 0] } },
              },
            },
          ],

          // ✅ cadrat total (një rresht)
          umbrellas: [
            { $match: { sourceType: "cadra" } },
            {
              $group: {
                _id: null,
                orderCount: { $sum: 1 },
                totalRevenue: { $sum: { $ifNull: ["$totalALL", 0] } },
              },
            },
          ],
        },
      },
    ]);

    const waiters = (faceted?.waiters || []).map((w) => ({
      waiterName: w._id || "Pa emër",
      orderCount: Number(w.orderCount || 0),
      totalRevenue: Number(w.totalRevenue || 0),
    }));

    const roomsAgg = (faceted?.rooms || [])[0] || { orderCount: 0, totalRevenue: 0 };
    const umbAgg = (faceted?.umbrellas || [])[0] || { orderCount: 0, totalRevenue: 0 };

    res.json({
      waiters,
      rooms: {
        label: "Dhoma",
        orderCount: Number(roomsAgg.orderCount || 0),
        totalRevenue: Number(roomsAgg.totalRevenue || 0),
      },
      umbrellas: {
        label: "Cadra",
        orderCount: Number(umbAgg.orderCount || 0),
        totalRevenue: Number(umbAgg.totalRevenue || 0),
      },
    });
  } catch (err) {
    console.error("❌ Gabim te getWaiterStats:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};
