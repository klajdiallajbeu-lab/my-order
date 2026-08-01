// ============================================================================
//  REFERENCË BACKEND — controller-i për  POST /places/generate
// ----------------------------------------------------------------------------
//  Ky është një version "drop-in" i bazuar te skema që duket nga frontend-i:
//    Place { businessId, type, code, codeNormalized, qrToken, isActive }
//
//  ⚠️ Kontrollo 2 gjëra kundrejt kodit tënd real përpara se ta përdorësh:
//     1) Emrin/rrugën e modelit Place (këtu supozohet ../models/Place)
//     2) Si e gjeneron aktualisht qrToken (këtu përdoret makeToken)
//
//  Nëse skema jote ndryshon, ma dërgo controller-in aktual + modelin Place
//  dhe ta kthej të përshtatur saktësisht.
// ============================================================================

const Place = require("../models/Place");
const makeToken = require("../utils/makeToken");

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

exports.generatePlaces = async (req, res) => {
  try {
    const { businessId, type } = req.body;
    let { total, prefix, start } = req.body;

    // ---- validime bazë ----
    if (!businessId) {
      return res.status(400).json({ message: "Mungon businessId." });
    }

    const ALLOWED = ["table", "room", "umbrella"];
    if (!ALLOWED.includes(type)) {
      return res.status(400).json({ message: "Tip i pavlefshëm." });
    }

    total = Number(total);
    if (!Number.isInteger(total) || total <= 0 || total > 500) {
      return res.status(400).json({ message: "Numri total s'është i saktë (1–500)." });
    }

    // tavolinat: gjithmonë numra 1..N pa prefiks
    // dhoma/çadra: prefiks opsional + numër fillestar
    start = type === "table" ? 1 : Number(start ?? 1);
    if (!Number.isInteger(start) || start < 0) {
      return res.status(400).json({ message: "Numri fillestar s'është i saktë." });
    }

    const cleanPrefix = type === "table" ? "" : normalizeCode(prefix);
    if (cleanPrefix && !/^[A-Z0-9-]+$/.test(cleanPrefix)) {
      return res.status(400).json({ message: "Prefiksi lejohet vetëm A-Z, 0-9, '-'." });
    }

    // ---- kodet që duam të krijojmë ----
    const wanted = [];
    for (let i = 0; i < total; i++) {
      wanted.push(normalizeCode(`${cleanPrefix}${start + i}`));
    }

    // ---- shmang dublikatat ekzistuese për këtë biznes + tip ----
    const existing = await Place.find({
      businessId,
      type,
      codeNormalized: { $in: wanted },
    }).select("codeNormalized").lean();

    const existingSet = new Set(existing.map((e) => e.codeNormalized));
    const toCreate = wanted.filter((code) => !existingSet.has(code));

    if (toCreate.length === 0) {
      return res.status(409).json({
        message: "Të gjitha kodet ekzistojnë tashmë.",
        created: 0,
        skipped: wanted.length,
      });
    }

    // ---- ndërto dokumentet me qrToken unik ----
    const docs = toCreate.map((code) => ({
      businessId,
      type,
      code,
      codeNormalized: code,
      qrToken: makeToken(16),
      isActive: true,
    }));

    // ordered:false → nëse ndonjë përplaset me index unik, të tjerat ruhen
    const inserted = await Place.insertMany(docs, { ordered: false });

    return res.status(201).json({
      message: "U krijuan me sukses.",
      created: inserted.length,
      skipped: wanted.length - inserted.length,
    });
  } catch (err) {
    // duplicate key (race condition) — kthe një mesazh të butë
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Disa kode ekzistonin tashmë." });
    }
    console.error("generatePlaces error:", err);
    return res.status(500).json({ message: "Gabim serveri." });
  }
};