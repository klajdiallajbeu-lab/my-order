import express from "express";
import {
  getBusinessById,
  getBusinessSettings,
  updateBusinessSettings,
  updateBusinessProfile,
} from "../controllers/businessController.js";
import Business from "../models/Business.js";
import { protectUser, requireRole } from "../middleware/protectUser.js";

const router = express.Router();

const isHHMM = (v) =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

const canAccessBusiness = (req, businessId) => {
  if (!req.user) return false;
  if (req.user.role === "admin") return true;
  return String(req.user.businessId || "") === String(businessId || "");
};

/* =========================
   ORDER ACCESS SETTINGS
========================= */

router.get(
  "/order-access",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const { businessId } = req.query;

      if (!businessId) {
        return res.status(400).json({ message: "Missing businessId" });
      }

      if (!canAccessBusiness(req, businessId)) {
        return res.status(403).json({ message: "Nuk ke akses për këtë biznes." });
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
  }
);

router.patch(
  "/order-access",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const { businessId, enabled, windowStart, windowEnd, applyTo } = req.body;

      if (!businessId) {
        return res.status(400).json({ message: "Missing businessId" });
      }

      if (!canAccessBusiness(req, businessId)) {
        return res.status(403).json({ message: "Nuk ke akses për këtë biznes." });
      }

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
  }
);

/* =========================
   BUSINESS SETTINGS
========================= */

router.get(
  "/:id/settings",
  protectUser,
  requireRole("manager", "admin", "waiter", "printer"),
  (req, res, next) => {
    if (!canAccessBusiness(req, req.params.id)) {
      return res.status(403).json({ message: "Nuk ke akses për këtë biznes." });
    }

    next();
  },
  getBusinessSettings
);

router.patch(
  "/:id/profile",
  protectUser,
  requireRole("manager", "admin"),
  (req, res, next) => {
    if (!canAccessBusiness(req, req.params.id)) {
      return res.status(403).json({ message: "Nuk ke akses për këtë biznes." });
    }

    next();
  },
  updateBusinessProfile
);

router.get(
  "/:id",
  protectUser,
  requireRole("manager", "admin"),
  (req, res, next) => {
    if (!canAccessBusiness(req, req.params.id)) {
      return res.status(403).json({ message: "Nuk ke akses për këtë biznes." });
    }

    next();
  },
  getBusinessById
);

/* =========================
   PUBLIC — emri i biznesit
   (për ClientMenuPage / ClientOrderPage, pa login)
========================= */
router.get("/:id/public-name", async (req, res) => {
  try {
    const b = await Business.findById(req.params.id)
      .select("hotelName businessName name")
      .lean();

    if (!b) {
      return res.status(404).json({ message: "Business not found" });
    }

    return res.json({
      hotelName: b.hotelName || b.businessName || b.name || "",
    });
  } catch (err) {
    console.error("GET /api/business/:id/public-name error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;