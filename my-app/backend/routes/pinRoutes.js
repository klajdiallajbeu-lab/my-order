import express from "express";
import Business from "../models/Business.js";
import { getTodayTirane, generateRandomPin } from "../utils/pinUtils.js";

const router = express.Router();

// GET /api/pin/today?businessId=...
router.get("/today", async (req, res) => {
  const { businessId } = req.query;
  if (!businessId) return res.status(400).json({ message: "Missing businessId" });

  const business = await Business.findById(businessId);
  if (!business) return res.status(404).json({ message: "Business not found" });

  const today = getTodayTirane();
  let pin = String(business.orderPin?.code || "").trim().toUpperCase();

  if (!pin || String(business.orderPin?.day || "") !== today) {
    pin = generateRandomPin();
    business.orderPin = { code: pin, day: today, enabled: true };
    await business.save();
  }

  return res.json({ pin, day: today, enabled: business.orderPin?.enabled !== false });
});

// POST /api/pin/regenerate  { businessId }
router.post("/regenerate", async (req, res) => {
  const { businessId } = req.body;
  if (!businessId) return res.status(400).json({ message: "Missing businessId" });

  const business = await Business.findById(businessId);
  if (!business) return res.status(404).json({ message: "Business not found" });

  const today = getTodayTirane();
  const pin = generateRandomPin();
  business.orderPin = { code: pin, day: today, enabled: true };
  await business.save();

  return res.json({ pin, day: today });
});

// POST /api/pin/enable { businessId, enabled }
router.post("/enable", async (req, res) => {
  const { businessId, enabled } = req.body;
  if (!businessId) return res.status(400).json({ message: "Missing businessId" });

  const business = await Business.findByIdAndUpdate(
    businessId,
    { "orderPin.enabled": !!enabled },
    { new: true }
  );

  if (!business) return res.status(404).json({ message: "Business not found" });

  return res.json({ enabled: business.orderPin?.enabled !== false });
});

export default router;
