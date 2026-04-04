import express from "express";
import {
  getBusinessById,
  getBusinessSettings,
  updateBusinessSettings,
} from "../controllers/businessController.js";
import Business from "../models/Business.js";

const router = express.Router();

/* =========================
   ORDER ACCESS SETTINGS
========================= */
router.get("/order-access", async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ message: "Missing businessId" });
    }

    const b = await Business.findById(businessId).lean();

    if (!b) {
      return res.status(404).json({ message: "Business not found" });
    }

    return res.json(b.settings?.orderAccess || {});
  } catch (err) {
    console.error("GET /api/business/order-access error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/order-access", async (req, res) => {
  try {
    const { businessId, enabled, windowStart, windowEnd, applyTo } = req.body;

    if (!businessId) {
      return res.status(400).json({ message: "Missing businessId" });
    }

    const isHHMM = (v) =>
      typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

    const setObj = {};

    if (typeof enabled === "boolean") {
      setObj["settings.orderAccess.enabled"] = enabled;
    }

    if (isHHMM(windowStart)) {
      setObj["settings.orderAccess.windowStart"] = windowStart;
    }

    if (isHHMM(windowEnd)) {
      setObj["settings.orderAccess.windowEnd"] = windowEnd;
    }

    if (Array.isArray(applyTo) && applyTo.length) {
      const clean = applyTo.filter((x) => ["room", "umbrella"].includes(x));
      if (clean.length) {
        setObj["settings.orderAccess.applyTo"] = clean;
      }
    }

    const b = await Business.findByIdAndUpdate(
      businessId,
      { $set: setObj },
      { new: true }
    ).lean();

    if (!b) {
      return res.status(404).json({ message: "Business not found" });
    }

    return res.json(b.settings?.orderAccess || {});
  } catch (err) {
    console.error("PATCH /api/business/order-access error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   ORDER PIN (REAL DAILY CODE)
========================= */
router.get("/order-pin", async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ message: "Missing businessId" });
    }

    const b = await Business.findById(businessId).lean();

    if (!b) {
      return res.status(404).json({ message: "Business not found" });
    }

    return res.json({
      code: b.orderPin?.code || "",
      day: b.orderPin?.day || "",
      enabled: b.orderPin?.enabled !== false,
    });
  } catch (err) {
    console.error("GET /api/business/order-pin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id/settings", getBusinessSettings);
router.patch("/:id/settings", updateBusinessSettings);
router.get("/:id", getBusinessById);

export default router;