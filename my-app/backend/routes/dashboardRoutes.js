import express from "express";
import Order from "../models/Order.js";

const router = express.Router();

// GET /api/dashboard/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;

    // Build query per range date
    const query = {};
    if (from && to) {
      query.createdAt = {
        $gte: new Date(from + "T00:00:00"),
        $lte: new Date(to + "T23:59:59"),
      };
    }

    const orders = await Order.find(query);

    // Totali për Dhoma
    const totalRooms = orders
      .filter(o => o.source === "room")
      .reduce((sum, o) => sum + o.total, 0);

    // Totali për Çadra
    const totalUmbrellas = orders
      .filter(o => o.source === "umbrella")
      .reduce((sum, o) => sum + o.total, 0);

    // Totali i të gjitha revenue
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

    // Xhiro për kamarjerë (vetëm walkin/restaurant)
    const waiterMap = {};
    orders.forEach(o => {
      if (o.source !== "room" && o.source !== "umbrella") {
        if (!waiterMap[o.waiter]) waiterMap[o.waiter] = 0;
        waiterMap[o.waiter] += o.total;
      }
    });

    const waiterStats = Object.entries(waiterMap).map(([waiter, total]) => ({
      waiterName: waiter,
      totalRevenue: total
    }));

    // Për byDay
    const byDay = {};
    orders.forEach(o => {
      const d = new Date(o.createdAt);
      const dateKey = d.toISOString().split("T")[0];
      if (!byDay[dateKey]) byDay[dateKey] = 0;
      byDay[dateKey] += o.total;
    });
    const byDayArr = Object.keys(byDay).map(date => ({
      date,
      total: byDay[date]
    }));

    return res.json({
      totalRevenue,
      totalRooms,
      totalUmbrellas,
      orderCount: orders.length,
      byDay: byDayArr,
      waiterStats
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;