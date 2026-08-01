import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Place from "../models/Place.js";
import GuestSession from "../models/GuestSession.js";

import { protectUser, requireRole } from "../middleware/protectUser.js";
import { protectWaiter } from "../middleware/protectWaiter.js";

const router = express.Router();

const norm = (v) => String(v || "").trim().toUpperCase();
const makeToken = () => crypto.randomBytes(16).toString("hex");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id || "").trim());

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id).trim());

const ALLOWED_TYPES = ["room", "umbrella", "table"];

/* =========================
   PUBLIC QR
========================= */

router.get("/by-token/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();

    if (!token) return res.status(400).json({ message: "Invalid token" });

    const place = await Place.findOne({ qrToken: token }).select("-qrToken");

    if (!place) return res.status(404).json({ message: "QR i pavlefshëm" });

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

    let existingSession = await GuestSession.findOne({
      businessId: place.businessId,
      sourceType,
      sourceNumber,
      active: true,
    }).sort({ createdAt: -1 });

    if (
      existingSession &&
      existingSession.expiresAt &&
      new Date(existingSession.expiresAt) <= now
    ) {
      existingSession.active = false;
      await existingSession.save();
      existingSession = null;
    }

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
   MANAGER / ADMIN
========================= */

router.get(
  "/",
  async (req, res) => {
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

      const list = await Place.find({
        businessId: toObjectId(businessId),
        type: String(type).trim().toLowerCase(),
      }).sort({ codeNormalized: 1 });

      return res.json(list);
    } catch (e) {
      console.error("GET /api/places error:", e);
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  }
);

router.post(
  "/",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
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

      if (!codeNorm) return res.status(400).json({ message: "Missing code" });

      if (!/^[A-Z0-9-]+$/.test(codeNorm)) {
        return res.status(400).json({ message: "Invalid code format" });
      }

      const created = await Place.create({
        businessId: toObjectId(businessId),
        type: String(type).trim().toLowerCase(),
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
  }
);

/* =========================
   GENERATE
   - table    : fshi & rikrijo 1..N        (si më parë)
   - room     : prefiks + numër fillestar, SHTESE (pa fshirë)
   - umbrella : prefiks + numër fillestar, SHTESE (pa fshirë)
========================= */
router.post(
  "/generate",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const { businessId, type } = req.body;
      let { total, prefix, start } = req.body;

      if (!businessId) {
        return res.status(400).json({ message: "Missing businessId" });
      }

      if (!isValidObjectId(businessId)) {
        return res.status(400).json({ message: "Invalid businessId" });
      }

      const normalizedType = String(type || "").trim().toLowerCase();

      if (!ALLOWED_TYPES.includes(normalizedType)) {
        return res.status(400).json({ message: "Invalid type" });
      }

      const totalNumber = Number(total);

      if (
        !Number.isInteger(totalNumber) ||
        totalNumber <= 0 ||
        totalNumber > 500
      ) {
        return res
          .status(400)
          .json({ message: "Vendos një numër të saktë (1–500)" });
      }

      const biz = toObjectId(businessId);

      // -------------------------------------------------------------
      //  TAVOLINA — sjellje identike me më parë: fshi & rikrijo 1..N
      // -------------------------------------------------------------
      if (normalizedType === "table") {
        await Place.deleteMany({ businessId: biz, type: "table" });

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
      }

      // -------------------------------------------------------------
      //  DHOMA / ÇADRA — prefiks opsional + numër fillestar
      //  SHTESE: nuk fshin asgjë; kalon kodet që ekzistojnë tashmë,
      //  që QR-të e printuara të mos ndryshojnë kurrë.
      // -------------------------------------------------------------
      const startNum = Number(start ?? 1);
      if (!Number.isInteger(startNum) || startNum < 0) {
        return res
          .status(400)
          .json({ message: "Numri fillestar s'është i saktë" });
      }

      const cleanPrefix = norm(prefix); // uppercase; "" nëse bosh
      if (cleanPrefix && !/^[A-Z0-9-]+$/.test(cleanPrefix)) {
        return res
          .status(400)
          .json({ message: "Prefiksi lejohet vetëm A-Z, 0-9, '-'" });
      }

      // Ndërto kodet e kërkuara (p.sh. A1, A2, ... A30)
      const wanted = [];
      for (let i = 0; i < totalNumber; i++) {
        const codeStr = `${cleanPrefix}${startNum + i}`;
        if (!/^[A-Z0-9-]+$/.test(codeStr)) {
          return res
            .status(400)
            .json({ message: `Kod i pavlefshëm: ${codeStr}` });
        }
        wanted.push(codeStr);
      }

      // codeNormalized ruhet LOWERCASE në DB → krahaso me lowercase
      const wantedLower = wanted.map((c) => c.toLowerCase());

      const existing = await Place.find({
        businessId: biz,
        type: normalizedType,
        codeNormalized: { $in: wantedLower },
      })
        .select("codeNormalized")
        .lean();

      const existingSet = new Set(
        existing.map((e) => String(e.codeNormalized).toLowerCase())
      );

      const docs = wanted
        .filter((code) => !existingSet.has(code.toLowerCase()))
        .map((code) => ({
          businessId: biz,
          type: normalizedType,
          code, // p.sh. "A1"
          codeNormalized: code, // schema e kthen në lowercase ("a1")
          qrToken: makeToken(),
          isActive: true,
          isOccupied: false,
          occupiedByWaiterId: null,
          occupiedAt: null,
        }));

      if (docs.length === 0) {
        return res.status(409).json({
          message: "Të gjitha kodet ekzistojnë tashmë",
          created: 0,
          skipped: wanted.length,
        });
      }

      // ordered:false → edhe nëse ndonjë përplaset (race), të tjerat ruhen
      const inserted = await Place.insertMany(docs, { ordered: false });

      const label = normalizedType === "room" ? "dhoma" : "çadra";
      return res.status(201).json({
        message: `U krijuan ${inserted.length} ${label}`,
        created: inserted.length,
        skipped: wanted.length - inserted.length,
      });
    } catch (e) {
      if (e?.code === 11000) {
        return res
          .status(409)
          .json({ message: "Disa kode ekzistonin tashmë" });
      }
      console.error("POST /api/places/generate error:", e);
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  }
);

router.patch(
  "/:id/active",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
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

      if (!updated) return res.status(404).json({ message: "Not found" });

      return res.json(updated);
    } catch (e) {
      console.error("PATCH /api/places/:id/active error:", e);
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  }
);

/* =========================
   DELETE PLACE (tavolinë / dhomë / çadër)
========================= */
router.delete(
  "/:id",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { businessId } = req.query;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      // Nëse dërgohet businessId, sigurohu që vendi i përket atij biznesi
      const filter = { _id: toObjectId(id) };
      if (businessId && isValidObjectId(businessId)) {
        filter.businessId = toObjectId(businessId);
      }

      const deleted = await Place.findOneAndDelete(filter);

      if (!deleted) return res.status(404).json({ message: "Not found" });

      return res.json({ message: "U fshi", id });
    } catch (e) {
      console.error("DELETE /api/places/:id error:", e);
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  }
);

/* =========================
   BULK DELETE
   - { businessId, type, ids: [...] }  → fshi të zgjedhurat
   - { businessId, type, all: true }   → fshi të gjitha të atij tipi
========================= */
router.post(
  "/bulk-delete",
  protectUser,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const { businessId, type, ids, all } = req.body;

      if (!businessId || !isValidObjectId(businessId)) {
        return res.status(400).json({ message: "Invalid businessId" });
      }

      const normalizedType = String(type || "").trim().toLowerCase();
      if (!ALLOWED_TYPES.includes(normalizedType)) {
        return res.status(400).json({ message: "Invalid type" });
      }

      const biz = toObjectId(businessId);

      // Fshi të gjitha të këtij tipi
      if (all === true) {
        const r = await Place.deleteMany({ businessId: biz, type: normalizedType });
        return res.json({ message: "U fshinë të gjitha", deleted: r.deletedCount || 0 });
      }

      // Fshi vetëm ID-të e zgjedhura (dhe vetëm ato që i përkasin biznesit + tipit)
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Asnjë ID për fshirje" });
      }

      const validIds = ids
        .filter((id) => isValidObjectId(id))
        .map((id) => toObjectId(id));

      if (validIds.length === 0) {
        return res.status(400).json({ message: "ID të pavlefshme" });
      }

      const r = await Place.deleteMany({
        _id: { $in: validIds },
        businessId: biz,
        type: normalizedType,
      });

      return res.json({ message: "U fshinë", deleted: r.deletedCount || 0 });
    } catch (e) {
      console.error("POST /api/places/bulk-delete error:", e);
      return res.status(500).json({ message: e?.message || "Server error" });
    }
  }
);

/* =========================
   WAITER
========================= */

router.patch("/:id/occupy", protectWaiter, async (req, res) => {
  try {
    const { id } = req.params;
    const waiterId = req.user?.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    if (!waiterId || !isValidObjectId(waiterId)) {
      return res.status(400).json({ message: "Invalid waiterId" });
    }

    const place = await Place.findById(id);

    if (!place) return res.status(404).json({ message: "Place not found" });

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

router.patch("/:id/release", protectWaiter, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const place = await Place.findById(id);

    if (!place) return res.status(404).json({ message: "Place not found" });

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