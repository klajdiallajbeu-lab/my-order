import Business from "../models/Business.js";

const ALLOWED_CURRENCIES = ["ALL", "EUR", "USD", "CHF", "GBP"];

export const getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).lean();

    if (!business) {
      return res.status(404).json({ message: "Biznesi nuk u gjet" });
    }

    res.json(business);
  } catch (err) {
    console.error("getBusinessById error:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

// PATCH /api/business/:id/profile
// Përdoret nga Manager — lejon vetëm name/nipt/address/city.
// phone/email NUK lejohen këtu (vetëm Admin i ndryshon, për arsye sigurie).
export const updateBusinessProfile = async (req, res) => {
  try {
    const { name, nipt, address, city } = req.body;

    const update = {};

    if (name !== undefined) {
      const clean = String(name).trim();
      if (!clean) {
        return res.status(400).json({ message: "Emri i biznesit nuk mund të jetë bosh" });
      }
      update.name = clean;
    }

    if (nipt !== undefined) update.nipt = String(nipt).trim();
    if (address !== undefined) update.address = String(address).trim();
    if (city !== undefined) update.city = String(city).trim();

    // Siguri shtesë: hidh poshtë çdo përpjekje për të ndryshuar phone/email këtej
    delete req.body.phone;
    delete req.body.email;

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).lean();

    if (!business) {
      return res.status(404).json({ message: "Biznesi nuk u gjet" });
    }

    res.json(business);
  } catch (err) {
    console.error("updateBusinessProfile error:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

export const getBusinessSettings = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .select("settings")
      .lean();

    if (!business) {
      return res.status(404).json({ message: "Biznesi nuk u gjet" });
    }

    res.json({ settings: business.settings || {} });
  } catch (err) {
    console.error("getBusinessSettings error:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

export const updateBusinessSettings = async (req, res) => {
  try {
    const {
      eurRate,
      usdRate,
      chfRate,
      gbpRate,
      baseCurrency,
      showCurrencies,

      kitchenPrinterName,
      barPrinterName,
      invoicePrinterName,
    } = req.body;

    const update = {};

    const setRate = (field, value) => {
      const num = Number(value);

      if (!Number.isFinite(num) || num <= 0) {
        return false;
      }

      update[`settings.${field}`] = num;
      update[`settings.${field}UpdatedAt`] = new Date();
      return true;
    };

    if (eurRate !== undefined && !setRate("eurRate", eurRate)) {
      return res.status(400).json({ message: "eurRate duhet të jetë numër > 0" });
    }

    if (usdRate !== undefined && !setRate("usdRate", usdRate)) {
      return res.status(400).json({ message: "usdRate duhet të jetë numër > 0" });
    }

    if (chfRate !== undefined && !setRate("chfRate", chfRate)) {
      return res.status(400).json({ message: "chfRate duhet të jetë numër > 0" });
    }

    if (gbpRate !== undefined && !setRate("gbpRate", gbpRate)) {
      return res.status(400).json({ message: "gbpRate duhet të jetë numër > 0" });
    }

    if (baseCurrency !== undefined) {
      if (!ALLOWED_CURRENCIES.includes(baseCurrency)) {
        return res.status(400).json({ message: "baseCurrency e pavlefshme" });
      }

      update["settings.baseCurrency"] = baseCurrency;
    }

    if (showCurrencies !== undefined) {
      if (!Array.isArray(showCurrencies)) {
        return res.status(400).json({ message: "showCurrencies duhet të jetë array" });
      }

      const invalid = showCurrencies.filter((c) => !ALLOWED_CURRENCIES.includes(c));
      if (invalid.length > 0) {
        return res.status(400).json({
          message: `Monedha të pavlefshme: ${invalid.join(", ")}`,
        });
      }

      update["settings.showCurrencies"] = showCurrencies;
    }

    if (kitchenPrinterName !== undefined) {
      update["settings.kitchenPrinterName"] = String(kitchenPrinterName || "").trim();
    }

    if (barPrinterName !== undefined) {
      update["settings.barPrinterName"] = String(barPrinterName || "").trim();
    }

    if (invoicePrinterName !== undefined) {
      update["settings.invoicePrinterName"] = String(invoicePrinterName || "").trim();
    }

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    )
      .select("settings")
      .lean();

    if (!business) {
      return res.status(404).json({ message: "Biznesi nuk u gjet" });
    }

    res.json({ settings: business.settings || {} });
  } catch (err) {
    console.error("updateBusinessSettings error:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};