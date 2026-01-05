// controllers/businessController.js
import Business from "../models/Business.js";

export const getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).lean();
    if (!business) return res.status(404).json({ message: "Biznesi nuk u gjet" });
    res.json(business);
  } catch (err) {
    res.status(500).json({ message: "Gabim serveri" });
  }
};

// ✅ GET /api/business/:id/settings
export const getBusinessSettings = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .select("settings")
      .lean();

    if (!business) return res.status(404).json({ message: "Biznesi nuk u gjet" });

    res.json({ settings: business.settings || {} });
  } catch (err) {
    res.status(500).json({ message: "Gabim serveri" });
  }
};

// ✅ PATCH /api/business/:id/settings
export const updateBusinessSettings = async (req, res) => {
  try {
    const { eurRate, usdRate, baseCurrency, showCurrencies } = req.body;

    const update = {};

    if (eurRate !== undefined) {
      const num = Number(eurRate);
      if (!Number.isFinite(num) || num <= 0) {
        return res.status(400).json({ message: "eurRate duhet të jetë numër > 0" });
      }
      update["settings.eurRate"] = num;
      update["settings.eurRateUpdatedAt"] = new Date();
    }

    if (usdRate !== undefined) {
      const num = Number(usdRate);
      if (!Number.isFinite(num) || num <= 0) {
        return res.status(400).json({ message: "usdRate duhet të jetë numër > 0" });
      }
      update["settings.usdRate"] = num;
      update["settings.usdRateUpdatedAt"] = new Date();
    }

    if (baseCurrency !== undefined) update["settings.baseCurrency"] = baseCurrency;
    if (showCurrencies !== undefined) update["settings.showCurrencies"] = showCurrencies;

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).lean();

    if (!business) return res.status(404).json({ message: "Biznesi nuk u gjet" });

    // kthe vetëm settings (më e pastër për UI)
    res.json({ settings: business.settings });
  } catch (err) {
    res.status(500).json({ message: "Gabim serveri" });
  }
};
