import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Place from "../models/Place.js";

const router = express.Router();

const norm = (v) => String(v || "").trim().toUpperCase();
const makeToken = () => crypto.randomBytes(16).toString("hex");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id || "").trim());

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id).trim());

/* =========================
   PUBLIC
========================= */

// ✅ GET /api/places/by-token/:token  (ClientOrderPage e përdor këtë)
router.get("/by-token/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token) return res.status(400).json({ message: "Invalid token" });

    // (opsionale) fsheh qrToken në response
    const place = await Place.findOne({ qrToken: token }).select("-qrToken");
    if (!place) return res.status(404).json({ message: "QR i pavlefshëm" });

    if (place.isActive === false) {
      return res.status(403).json({ message: "Ky kod është inactive." });
    }

    return res.json(place);
  } catch (e) {
    console.error("GET /api/places/by-token/:token error:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

/* =========================
   MANAGER
========================= */

// GET /api/places?businessId=...&type=room|umbrella
router.get("/", async (req, res) => {
  try {
    const { businessId, type } = req.query;

    if (!businessId) return res.status(400).json({ message: "Missing businessId" });
    if (!isValidObjectId(businessId)) return res.status(400).json({ message: "Invalid businessId" });

    if (!type || !["room", "umbrella"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const biz = toObjectId(businessId);

    const list = await Place.find({ businessId: biz, type }).sort({ createdAt: -1 });
    return res.json(list);
  } catch (e) {
    console.error("GET /api/places error:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

// POST /api/places
router.post("/", async (req, res) => {
  try {
    const { businessId, type, code } = req.body;

    if (!businessId) return res.status(400).json({ message: "Missing businessId" });
    if (!isValidObjectId(businessId)) return res.status(400).json({ message: "Invalid businessId" });

    if (!type || !["room", "umbrella"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const codeNorm = norm(code);
    if (!codeNorm) return res.status(400).json({ message: "Missing code" });

    // vetëm A-Z 0-9 dhe -
    if (!/^[A-Z0-9-]+$/.test(codeNorm)) {
      return res.status(400).json({ message: "Invalid code format" });
    }

    const biz = toObjectId(businessId);

    const created = await Place.create({
      businessId: biz,
      type,
      code: codeNorm,
      codeNormalized: codeNorm,
      qrToken: makeToken(),
      isActive: true,
    });

    return res.status(201).json(created);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Ky kod ekziston." });
    }
    console.error("POST /api/places error:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

// PATCH /api/places/:id/active
router.patch("/:id/active", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const updated = await Place.findByIdAndUpdate(
      id,
      { isActive: !!isActive },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json(updated);
  } catch (e) {
    console.error("PATCH /api/places/:id/active error:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

export default router;
