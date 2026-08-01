// routes/qrRoutes.js
import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import DynamicQr from "../models/DynamicQr.js";

import { protectUser, requireRole } from "../middleware/protectUser.js";

const router = express.Router();

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id || "").trim());

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id).trim());

/* ============================================================
   IZOLIMI MES BIZNESEVE

   Rregulli: businessId merret GJITHMONË nga token-i.
   Vetëm admin-i (që nuk ka businessId në token) mund të
   veprojë mbi biznese të tjera, dhe atëherë duhet ta japë
   shprehimisht businessId.

   Ky është i njëjti model si te productController.readBusinessId.
============================================================ */
const readBusinessId = (req) => {
  // Manager / waiter / printer -> gjithmonë nga token-i
  if (req.user?.businessId) {
    return String(req.user.businessId);
  }

  // Admin (pa businessId) -> lejohet ta japë vetë
  if (req.user?.role === "admin") {
    const q = req?.query ?? {};
    const b = req?.body ?? {};
    return String(q.businessId || b.businessId || "").trim();
  }

  return "";
};

/**
 * Filtër pronësie për veprimet mbi një QR të vetëm.
 * Admin-i pa businessId -> pa kufizim.
 * Të gjithë të tjerët -> vetëm QR-të e biznesit të tyre.
 */
const ownershipFilter = (req, id) => {
  const filter = { _id: toObjectId(id) };

  if (req.user?.businessId) {
    filter.businessId = toObjectId(req.user.businessId);
  }

  return filter;
};

// Kod i lexueshëm pa karaktere të ngatërrueshme (pa 0/O/1/I)
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const genCode = (len = 6) => {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
};

// Normalizo linkun: shto https:// nëse mungon skema
const normalizeTarget = (t) => {
  const s = String(t || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
};

const isValidUrl = (s) => {
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;

    // Bllokon ridrejtimet drejt rrjetit të brendshëm (SSRF / abuzim)
    const host = u.hostname.toLowerCase();
    const blocked =
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "[::1]" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host) ||
      /^169\.254\./.test(host);

    return !blocked;
  } catch {
    return false;
  }
};

/* ============================================================
   PUBLIC — REDIRECT
   GET /api/qr/:code   → 302 te target-i i caktuar
   Ky është linku që futet në QR. Nuk ndryshon kurrë.
============================================================ */
router.get("/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim();

    if (!code || code.length > 32) {
      return res.status(400).send("Kod i pavlefshëm.");
    }

    const qr = await DynamicQr.findOne({ code })
      .select("_id target isActive")
      .lean();

    if (!qr || qr.isActive === false) {
      return res.status(404).send("QR i pavlefshëm ose i çaktivizuar.");
    }

    if (!qr.target) {
      return res.status(404).send("Ky QR nuk ka ende një link të caktuar.");
    }

    // Numëro skanimin pa e bllokuar redirect-in (fire-and-forget)
    DynamicQr.updateOne(
      { _id: qr._id },
      { $inc: { scans: 1 }, $set: { lastScanAt: new Date() } }
    ).catch(() => {});

    // Mos e ruaj ridrejtimin në cache - target-i mund të ndryshojë
    res.set("Cache-Control", "no-store");

    return res.redirect(302, qr.target);
  } catch (e) {
    console.error("GET /api/qr/:code error:", e);
    return res.status(500).send("Server error");
  }
});

/* ============================================================
   MANAGER / ADMIN
============================================================ */

// Listë e QR-ve të biznesit
router.get(
  "/manage/list",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const businessId = readBusinessId(req);

      if (!businessId || !isValidObjectId(businessId)) {
        return res.status(400).json({ message: "Invalid businessId" });
      }

      const list = await DynamicQr.find({ businessId: toObjectId(businessId) })
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();

      return res.json(list);
    } catch (e) {
      console.error("GET /api/qr/manage/list error:", e);
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  }
);

// Krijo një QR të vetëm (opsionale: label + target që në fillim)
router.post(
  "/manage",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const businessId = readBusinessId(req);

      if (!businessId || !isValidObjectId(businessId)) {
        return res.status(400).json({ message: "Invalid businessId" });
      }

      const { label, target } = req.body;

      const normTarget = normalizeTarget(target);
      if (normTarget && !isValidUrl(normTarget)) {
        return res.status(400).json({ message: "Link i pavlefshëm" });
      }

      // gjenero kod unik
      let code = genCode(6);
      for (let i = 0; i < 5; i++) {
        const exists = await DynamicQr.exists({ code });
        if (!exists) break;
        code = genCode(6);
      }

      const created = await DynamicQr.create({
        businessId: toObjectId(businessId),
        code,
        label: String(label || "").trim().slice(0, 120),
        target: normTarget,
        isActive: true,
      });

      return res.status(201).json(created);
    } catch (e) {
      if (e?.code === 11000) {
        return res
          .status(409)
          .json({ message: "Kod i dublikuar, provo sërish." });
      }
      console.error("POST /api/qr/manage error:", e);
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  }
);

// Gjenero me shumicë N kode (target bosh, i mbush më vonë menaxheri)
router.post(
  "/manage/generate",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const businessId = readBusinessId(req);

      if (!businessId || !isValidObjectId(businessId)) {
        return res.status(400).json({ message: "Invalid businessId" });
      }

      const total = Number(req.body.total);
      const labelPrefix = String(req.body.labelPrefix || "")
        .trim()
        .slice(0, 60);

      if (!Number.isInteger(total) || total <= 0 || total > 500) {
        return res
          .status(400)
          .json({ message: "Vendos një numër të saktë (1–500)" });
      }

      const biz = toObjectId(businessId);

      // Gjenero kode unike brenda batch-it
      const codes = new Set();
      let guard = 0;
      while (codes.size < total && guard < total * 20) {
        codes.add(genCode(6));
        guard++;
      }

      const codeList = [...codes];

      // Hiq ato që mund të ekzistojnë tashmë në DB (shumë e rrallë)
      const existing = await DynamicQr.find({ code: { $in: codeList } })
        .select("code")
        .lean();
      const taken = new Set(existing.map((e) => e.code));

      const docs = codeList
        .filter((c) => !taken.has(c))
        .map((c, idx) => ({
          businessId: biz,
          code: c,
          label: labelPrefix ? `${labelPrefix} ${idx + 1}` : "",
          target: "",
          isActive: true,
        }));

      const inserted = await DynamicQr.insertMany(docs, { ordered: false });

      return res.status(201).json({
        message: `U krijuan ${inserted.length} QR`,
        created: inserted.length,
      });
    } catch (e) {
      console.error("POST /api/qr/manage/generate error:", e);
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  }
);

// Përditëso një QR (target / label / isActive)
router.patch(
  "/manage/:id",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const update = {};

      if (req.body.target !== undefined) {
        const normTarget = normalizeTarget(req.body.target);
        if (normTarget && !isValidUrl(normTarget)) {
          return res.status(400).json({ message: "Link i pavlefshëm" });
        }
        update.target = normTarget;
      }

      if (req.body.label !== undefined) {
        update.label = String(req.body.label || "").trim().slice(0, 120);
      }

      if (req.body.isActive !== undefined) {
        update.isActive = !!req.body.isActive;
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: "Asgjë për të përditësuar" });
      }

      // KRITIKE: filtri përfshin businessId-në e token-it.
      // Pa këtë, një menaxher mund të ndryshonte QR-të e një biznesi tjetër.
      const updated = await DynamicQr.findOneAndUpdate(
        ownershipFilter(req, id),
        update,
        { new: true }
      );

      if (!updated) return res.status(404).json({ message: "Not found" });

      return res.json(updated);
    } catch (e) {
      console.error("PATCH /api/qr/manage/:id error:", e);
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  }
);

// Fshi një QR
router.delete(
  "/manage/:id",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      // KRITIKE: po ashtu i kufizuar te biznesi i token-it.
      const deleted = await DynamicQr.findOneAndDelete(ownershipFilter(req, id));

      if (!deleted) return res.status(404).json({ message: "Not found" });

      return res.json({ message: "U fshi", id });
    } catch (e) {
      console.error("DELETE /api/qr/manage/:id error:", e);
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  }
);

export default router;