import ExchangeRate from "../models/ExchangeRate.js";

const getBusinessIdFromAuth = (req) => {
  const role = String(req.user?.role || "").toLowerCase();

  if (role === "admin") {
    return String(req.query.businessId || req.body.businessId || "").trim();
  }

  return String(req.user?.businessId || "").trim();
};

const cleanCurrency = (v, fallback) =>
  String(v || fallback || "")
    .trim()
    .toUpperCase();

export const getExchange = async (req, res) => {
  try {
    const businessId = getBusinessIdFromAuth(req);
    const base = cleanCurrency(req.query.base, "EUR");
    const quote = cleanCurrency(req.query.quote, "ALL");

    if (!businessId) {
      return res.status(400).json({
        message: "businessId është i detyrueshëm",
      });
    }

    const doc = await ExchangeRate.findOne({
      businessId,
      base,
      quote,
    }).lean();

    return res.json(doc || { businessId, base, quote, rate: 1 });
  } catch (e) {
    console.error("Gabim te getExchange:", e);
    return res.status(500).json({ message: "Gabim te getExchange" });
  }
};

export const upsertExchange = async (req, res) => {
  try {
    const businessId = getBusinessIdFromAuth(req);
    const base = cleanCurrency(req.body.base, "EUR");
    const quote = cleanCurrency(req.body.quote, "ALL");
    const numericRate = Number(req.body.rate);

    if (!businessId) {
      return res.status(400).json({
        message: "businessId është i detyrueshëm",
      });
    }

    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      return res.status(400).json({
        message: "rate duhet të jetë numër > 0",
      });
    }

    const updated = await ExchangeRate.findOneAndUpdate(
      { businessId, base, quote },
      { $set: { rate: numericRate } },
      { upsert: true, new: true }
    ).lean();

    return res.json(updated);
  } catch (e) {
    console.error("Gabim te upsertExchange:", e);
    return res.status(500).json({ message: "Gabim te upsertExchange" });
  }
};