import ExchangeRate from "../models/ExchangeRate.js";

export const getExchange = async (req, res) => {
  try {
    const { businessId, base = "EUR", quote = "ALL" } = req.query;
    if (!businessId) return res.status(400).json({ message: "businessId është i detyrueshëm" });

    const doc = await ExchangeRate.findOne({ businessId, base, quote }).lean();
    // nëse s'ka, kthe default (s'prish punë UI)
    res.json(doc || { businessId, base, quote, rate: 1 });
  } catch (e) {
    res.status(500).json({ message: "Gabim te getExchange" });
  }
};

export const upsertExchange = async (req, res) => {
  try {
    const { businessId, base = "EUR", quote = "ALL", rate } = req.body;

    if (!businessId) return res.status(400).json({ message: "businessId është i detyrueshëm" });
    const numericRate = Number(rate);
    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      return res.status(400).json({ message: "rate duhet të jetë numër > 0" });
    }

    const updated = await ExchangeRate.findOneAndUpdate(
      { businessId, base, quote },
      { $set: { rate: numericRate } },
      { upsert: true, new: true }
    ).lean();

    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: "Gabim te upsertExchange" });
  }
};
