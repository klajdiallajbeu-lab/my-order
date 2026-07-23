// controllers/periodCloseController.js
import mongoose from "mongoose";
import PeriodClose from "../models/PeriodClose.js";

const getBusinessIdFromAuth = (req) => {
  const role = String(req.user?.role || "").toLowerCase();

  if (role === "admin") {
    return String(req.query.businessId || req.body?.businessId || "").trim();
  }

  return String(req.user?.businessId || "").trim();
};

const MONTH_RE = /^\d{4}-\d{2}$/;

// GET /api/period-close  -> lista e muajve te mbyllur
export const getClosedPeriods = async (req, res) => {
  try {
    const businessId = getBusinessIdFromAuth(req);

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }

    const items = await PeriodClose.find({
      businessId: new mongoose.Types.ObjectId(businessId),
    })
      .sort({ month: -1 })
      .lean();

    return res.json({
      months: items.map((x) => x.month),
      items,
    });
  } catch (err) {
    console.error("getClosedPeriods:", err);
    return res
      .status(500)
      .json({ message: "Gabim në server", error: err.message });
  }
};

// POST /api/period-close  { month: "YYYY-MM", snapshot? }
export const closePeriod = async (req, res) => {
  try {
    const businessId = getBusinessIdFromAuth(req);

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }

    const month = String(req.body?.month || "").trim();

    if (!MONTH_RE.test(month)) {
      return res
        .status(400)
        .json({ message: "Muaji duhet në formatin YYYY-MM" });
    }

    // Nuk lejohet mbyllja e nje muaji qe s'ka mbaruar ende
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    if (month > currentMonth) {
      return res
        .status(400)
        .json({ message: "Nuk mund të mbyllet një muaj në të ardhmen" });
    }

    const exists = await PeriodClose.findOne({ businessId, month }).lean();

    if (exists) {
      return res.status(409).json({ message: "Ky muaj është mbyllur tashmë" });
    }

    const snap = req.body?.snapshot || {};

    const created = await PeriodClose.create({
      businessId,
      month,
      snapshot: {
        revenue: Number(snap.revenue || 0),
        expenses: Number(snap.expenses || 0),
        profit: Number(snap.profit || 0),
        orders: Number(snap.orders || 0),
      },
      closedBy: String(req.user?.name || req.user?.role || ""),
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("closePeriod:", err);
    return res
      .status(500)
      .json({ message: "Gabim në server", error: err.message });
  }
};

// DELETE /api/period-close/:month  -> rihapja (VETEM admin)
export const reopenPeriod = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();

    if (role !== "admin") {
      return res.status(403).json({
        message: "Vetëm administratori mund të rihapë një periudhë të mbyllur",
      });
    }

    const businessId = getBusinessIdFromAuth(req);
    const month = String(req.params.month || "").trim();

    if (!businessId || !MONTH_RE.test(month)) {
      return res.status(400).json({ message: "Të dhëna të pavlefshme" });
    }

    const deleted = await PeriodClose.findOneAndDelete({ businessId, month });

    if (!deleted) {
      return res.status(404).json({ message: "Kjo periudhë nuk është e mbyllur" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("reopenPeriod:", err);
    return res
      .status(500)
      .json({ message: "Gabim në server", error: err.message });
  }
};