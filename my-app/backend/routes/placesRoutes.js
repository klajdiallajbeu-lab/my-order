import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Place from "../models/Place.js";
import GuestSession from "../models/GuestSession.js";

const router = express.Router();

const norm = (v) => String(v || "").trim().toUpperCase();
const makeToken = () => crypto.randomBytes(16).toString("hex");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id || "").trim());

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id).trim());

const ALLOWED_TYPES = ["room", "umbrella", "table"];

/* =========================
   PUBLIC
========================= */

// GET /api/places/by-token/:token
router.get("/by-token/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();

    if (!token) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const place = await Place.findOne({ qrToken: token }).select("-qrToken");

    if (!place) {
      return res.status(404).json({ message: "QR i pavlefshëm" });
    }

    if (place.isActive === false) {
      return res.status(403).json({ message: "Ky kod është inactive." });
    }

const sourceType =
  place.type === "room"
    ? "dhoma"
    : place.type === "umbrella"
    ? "cadra"
    : "table";

const sourceNumber = String(place.code || "").trim();
const now = new Date();

// 🔍 gjej session aktiv
let existingSession = await GuestSession.findOne({
  businessId: place.businessId,
  sourceType,
  sourceNumber,
  active: true,
}).sort({ createdAt: -1 });

// nëse ekziston por ka skaduar, çaktivizoje
if (
  existingSession &&
  existingSession.expiresAt &&
  new Date(existingSession.expiresAt) <= now
) {
  existingSession.active = false;
  await existingSession.save();
  existingSession = null;
}

// nëse ekziston dhe është valid, përdore
if (existingSession) {
  return res.json({
    place,
    sessionToken: existingSession.token,
    expiresAt: existingSession.expiresAt,
    businessId: place.businessId,
    sourceType,
    sourceNumber,
  });
}

// 🆕 krijo session të ri
const sessionToken = crypto.randomBytes(24).toString("hex");
const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

await GuestSession.create({
  token: sessionToken,
  businessId: place.businessId,
  placeId: place._id,
  sourceType,
  sourceNumber,
  expiresAt,
  lastSeenAt: now,
  active: true,
});

return res.json({
  place,
  sessionToken,
  expiresAt,
  businessId: place.businessId,
  sourceType,
  sourceNumber,
});
  } catch (e) {
    console.error("GET /api/places/by-token/:token error:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

/* =========================
   MANAGER
========================= */

// GET /api/places?businessId=...&type=room|umbrella|table
router.get("/", async (req, res) => {
  try {
    const { businessId, type } = req.query;

    if (!businessId) {
      return res.status(400).json({ message: "Missing businessId" });
    }

    if (!isValidObjectId(businessId)) {
      return res.status(400).json({ message: "Invalid businessId" });
    }

    if (!type || !ALLOWED_TYPES.includes(String(type).trim().toLowerCase())) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const biz = toObjectId(businessId);
    const normalizedType = String(type).trim().toLowerCase();

    const list = await Place.find({
      businessId: biz,
      type: normalizedType,
    }).sort({ codeNormalized: 1 });

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

    if (!businessId) {
      return res.status(400).json({ message: "Missing businessId" });
    }

    if (!isValidObjectId(businessId)) {
      return res.status(400).json({ message: "Invalid businessId" });
    }

    if (!type || !ALLOWED_TYPES.includes(String(type).trim().toLowerCase())) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const codeNorm = norm(code);

    if (!codeNorm) {
      return res.status(400).json({ message: "Missing code" });
    }

    if (!/^[A-Z0-9-]+$/.test(codeNorm)) {
      return res.status(400).json({ message: "Invalid code format" });
    }

    const biz = toObjectId(businessId);
    const normalizedType = String(type).trim().toLowerCase();

    const created = await Place.create({
      businessId: biz,
      type: normalizedType,
      code: String(code).trim(),
      codeNormalized: codeNorm,
      qrToken: makeToken(),
      isActive: true,
      isOccupied: false,
      occupiedByWaiterId: null,
      occupiedAt: null,
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

// POST /api/places/generate
// body: { businessId, type: "table", total: 20 }
router.post("/generate", async (req, res) => {
  try {
    const { businessId, type, total } = req.body;

    if (!businessId) {
      return res.status(400).json({ message: "Missing businessId" });
    }

    if (!isValidObjectId(businessId)) {
      return res.status(400).json({ message: "Invalid businessId" });
    }

    if (String(type).trim().toLowerCase() !== "table") {
      return res.status(400).json({
        message: "Ky endpoint është vetëm për tavolina",
      });
    }

    const totalNumber = Number(total);

    if (!Number.isInteger(totalNumber) || totalNumber <= 0) {
      return res.status(400).json({ message: "Vendos një numër të saktë" });
    }

    const biz = toObjectId(businessId);

    await Place.deleteMany({
      businessId: biz,
      type: "table",
    });

    const tables = [];

    for (let i = 1; i <= totalNumber; i++) {
      const code = String(i);

      tables.push({
        businessId: biz,
        type: "table",
        code,
        codeNormalized: code.toUpperCase(),
        qrToken: makeToken(),
        isActive: true,
        isOccupied: false,
        occupiedByWaiterId: null,
        occupiedAt: null,
      });
    }

    await Place.insertMany(tables);

    return res.status(201).json({
      message: `U krijuan ${totalNumber} tavolina`,
    });
  } catch (e) {
    console.error("POST /api/places/generate error:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

// PATCH /api/places/:id/active
router.patch("/:id/active", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const updated = await Place.findByIdAndUpdate(
      id,
      { isActive: !!isActive },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.json(updated);
  } catch (e) {
    console.error("PATCH /api/places/:id/active error:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

// PATCH /api/places/:id/occupy
// body: { waiterId }
router.patch("/:id/occupy", async (req, res) => {
  try {
    const { id } = req.params;
    const { waiterId } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    if (!waiterId || !isValidObjectId(waiterId)) {
      return res.status(400).json({ message: "Invalid waiterId" });
    }

    const place = await Place.findById(id);

    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    if (!place.isActive) {
      return res.status(400).json({ message: "Place is inactive" });
    }

    if (
      place.isOccupied &&
      String(place.occupiedByWaiterId || "") !== String(waiterId)
    ) {
      return res.status(409).json({
        message: "Kjo tavolinë është zënë nga një kamarier tjetër",
      });
    }

    place.isOccupied = true;
    place.occupiedByWaiterId = toObjectId(waiterId);
    place.occupiedAt = new Date();

    await place.save();

    return res.json(place);
  } catch (e) {
    console.error("PATCH /api/places/:id/occupy error:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

// PATCH /api/places/:id/release
router.patch("/:id/release", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const place = await Place.findById(id);

    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    place.isOccupied = false;
    place.occupiedByWaiterId = null;
    place.occupiedAt = null;

    await place.save();

    return res.json(place);
  } catch (e) {
    console.error("PATCH /api/places/:id/release error:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

export default router;