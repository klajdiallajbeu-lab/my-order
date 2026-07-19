import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

const TIRANA_TZ = "Europe/Tirane";

const makeDateRange = (from, to) => {
  const range = {};

  if (from) range.$gte = new Date(`${from}T00:00:00+02:00`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999+02:00`);

  return Object.keys(range).length ? range : null;
};

const asObjectId = (id) => new mongoose.Types.ObjectId(id);

const getBusinessIdFromAuth = (req) => {
  const role = String(req.user?.role || "").toLowerCase();

  if (role === "admin") {
    return String(req.query.businessId || "").trim();
  }

  return String(req.user?.businessId || "").trim();
};

const emptyPeriodStats = {
  totalRevenue: 0,
  orderCount: 0,
  byDay: [],
};

const emptyWaiterStats = {
  waiters: [],
  rooms: { label: "Dhoma", orderCount: 0, totalRevenue: 0 },
  umbrellas: { label: "Cadra", orderCount: 0, totalRevenue: 0 },
};

/* ============================
   GET /api/stats/period
============================ */
export const getPeriodStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    const businessId = getBusinessIdFromAuth(req);

    if (!businessId) {
      return res.status(400).json({
        message: "businessId është i detyrueshëm",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.json(emptyPeriodStats);
    }

    const match = {
      businessId: asObjectId(businessId),
    };

    const dateRange = makeDateRange(from, to);
    if (dateRange) match.createdAt = dateRange;

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

    const stats = agg[0] || {
      totalRevenue: 0,
      orderCount: 0,
    };

    const byDayAgg = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
  format: "%Y-%m-%d",
  date: "$createdAt",
  timezone: TIRANA_TZ,
}
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

    return res.json({
      totalRevenue: Number(stats.totalRevenue || 0),
      orderCount: Number(stats.orderCount || 0),
      byDay,
    });
  } catch (err) {
    console.error("❌ Gabim te getPeriodStats:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================
   GET /api/stats/top-products
============================ */
export const getTopProducts = async (req, res) => {
  try {
    const { from, to, limit = 5 } = req.query;
    const businessId = getBusinessIdFromAuth(req);

    if (!businessId) {
      return res.status(400).json({
        message: "businessId është i detyrueshëm",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.json([]);
    }

    const match = {
      businessId: asObjectId(businessId),
    };

    const dateRange = makeDateRange(from, to);
    if (dateRange) match.createdAt = dateRange;

    const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 50);

    const agg = await Order.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
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
      { $sort: { qty: -1, revenue: -1 } },
      { $limit: safeLimit },
    ]);

    const result = agg.map((p) => ({
      name: p._id || "Pa emër",
      qty: Number(p.qty || 0),
      revenue: Number(p.revenue || 0),
    }));

    return res.json(result);
  } catch (err) {
    console.error("❌ Gabim te getTopProducts:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================
   GET /api/stats/waiters
============================ */
export const getWaiterStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    const businessId = getBusinessIdFromAuth(req);

    if (!businessId) {
      return res.status(400).json({
        message: "businessId është i detyrueshëm",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.json(emptyWaiterStats);
    }

    const match = {
      businessId: asObjectId(businessId),
    };

    const dateRange = makeDateRange(from, to);
    if (dateRange) match.createdAt = dateRange;

    const [faceted] = await Order.aggregate([
      { $match: match },
      {
        $facet: {
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

    const roomsAgg = (faceted?.rooms || [])[0] || {
      orderCount: 0,
      totalRevenue: 0,
    };

    const umbAgg = (faceted?.umbrellas || [])[0] || {
      orderCount: 0,
      totalRevenue: 0,
    };

    return res.json({
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
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ============================
   GET /api/stats/overview
   Përmbledhje për dashboard: krahasime me periudhën/ditën
   e mëparshme, numra statikë (produkte/staf), shitjet e sotme,
   dhe porositë e fundit.
============================ */
export const getOverviewStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    const businessId = getBusinessIdFromAuth(req);

    if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }

    const bizObjectId = asObjectId(businessId);

    // --- Periudha aktuale ---
    const dateRange = makeDateRange(from, to);
    const currentMatch = { businessId: bizObjectId };
    if (dateRange) currentMatch.createdAt = dateRange;

    const currentAgg = await Order.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ["$totalALL", 0] } },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const current = currentAgg[0] || { totalRevenue: 0, orderCount: 0 };

    // --- Periudha e mëparshme (e njëjta gjatësi, menjëherë para) ---
    let previous = { totalRevenue: 0, orderCount: 0 };

    if (dateRange?.$gte && dateRange?.$lte) {
      const spanMs = dateRange.$lte.getTime() - dateRange.$gte.getTime();
      const prevTo = new Date(dateRange.$gte.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - spanMs);

      const prevAgg = await Order.aggregate([
        {
          $match: {
            businessId: bizObjectId,
            createdAt: { $gte: prevFrom, $lte: prevTo },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $ifNull: ["$totalALL", 0] } },
            orderCount: { $sum: 1 },
          },
        },
      ]);

      previous = prevAgg[0] || { totalRevenue: 0, orderCount: 0 };
    }

    const pctChange = (curr, prev) => {
      if (!prev) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    // --- Sot vs dje (gjithmonë sipas ditës kalendarike, pavarësisht filtrit) ---
    const now = new Date();
    const todayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00+02:00`);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const todayAgg = await Order.aggregate([
      {
        $match: {
          businessId: bizObjectId,
          createdAt: { $gte: todayStart },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ["$totalALL", 0] } },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const yesterdayAgg = await Order.aggregate([
      {
        $match: {
          businessId: bizObjectId,
          createdAt: { $gte: yesterdayStart, $lt: todayStart },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ["$totalALL", 0] } },
        },
      },
    ]);

    const todayStats = todayAgg[0] || { totalRevenue: 0, orderCount: 0 };
    const yesterdayStats = yesterdayAgg[0] || { totalRevenue: 0 };

    // --- Mini-grafik: xhiro e 6 ditëve të fundit ---
    const sixDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

    const last6DaysAgg = await Order.aggregate([
      {
        $match: {
          businessId: bizObjectId,
          createdAt: { $gte: sixDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: TIRANA_TZ,
            },
          },
          total: { $sum: { $ifNull: ["$totalALL", 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // --- Numra statikë ---
    const productCount = await Product.countDocuments({ businessId: bizObjectId });
    const staffCount = await User.countDocuments({ businessId: bizObjectId });

    // --- Porositë e fundit ---
    const recentOrdersRaw = await Order.find({ businessId: bizObjectId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentOrders = recentOrdersRaw.map((o) => ({
      id: String(o._id),
      sourceType: o.sourceType || "",
      sourceNumber: o.sourceNumber || "",
      createdBy: o.createdBy || "",
      total: Number(o.totalALL || o.total || 0),
      createdAt: o.createdAt,
    }));

    return res.json({
      period: {
        totalRevenue: Number(current.totalRevenue || 0),
        orderCount: Number(current.orderCount || 0),
        revenueChangePct: pctChange(current.totalRevenue || 0, previous.totalRevenue || 0),
        ordersChangePct: pctChange(current.orderCount || 0, previous.orderCount || 0),
      },
      today: {
        totalRevenue: Number(todayStats.totalRevenue || 0),
        orderCount: Number(todayStats.orderCount || 0),
        changePct: pctChange(todayStats.totalRevenue || 0, yesterdayStats.totalRevenue || 0),
        last6Days: last6DaysAgg.map((d) => ({
          date: d._id,
          total: Number(d.total || 0),
        })),
      },
      productCount,
      staffCount,
      recentOrders,
    });
  } catch (err) {
    console.error("❌ Gabim te getOverviewStats:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};