// controllers/placeController.js
const Place = require("../models/Place");
const makeToken = require("../utils/makeToken");

const ALLOWED_TYPES = ["room", "umbrella", "table"];

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function isValidType(type) {
  return ALLOWED_TYPES.includes(String(type || "").trim().toLowerCase());
}

function buildReadableType(type) {
  if (type === "room") return "room";
  if (type === "umbrella") return "umbrella";
  if (type === "table") return "table";
  return "place";
}

/* =========================
   LIST PLACES
========================= */
exports.listPlaces = async (req, res) => {
  try {
    const { businessId, type } = req.query;

    if (!businessId) {
      return res.status(400).json({ message: "businessId required" });
    }

    if (!isValidType(type)) {
      return res.status(400).json({
        message: "type must be room|umbrella|table",
      });
    }

    const normalizedType = String(type).trim().toLowerCase();

    const places = await Place.find({
      businessId,
      type: normalizedType,
    })
      .sort({ codeNormalized: 1 })
      .lean();

    return res.json(places);
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/* =========================
   CREATE SINGLE PLACE
========================= */
exports.createPlace = async (req, res) => {
  try {
    const { businessId, type, code } = req.body;

    if (!businessId) {
      return res.status(400).json({ message: "businessId required" });
    }

    if (!isValidType(type)) {
      return res.status(400).json({
        message: "type must be room|umbrella|table",
      });
    }

    const normalizedType = String(type).trim().toLowerCase();
    const codeNormalized = normalizeCode(code);

    if (!codeNormalized) {
      return res.status(400).json({ message: "code required" });
    }

    // Lejojmë A-Z, 0-9 dhe -
    if (!/^[A-Z0-9-]+$/.test(codeNormalized)) {
      return res.status(400).json({ message: "Invalid code format" });
    }

    const place = await Place.create({
      businessId,
      type: normalizedType,
      code: String(code).trim(),
      codeNormalized,
      qrToken: makeToken(12),
      isActive: true,
      isOccupied: false,
      occupiedByWaiterId: null,
      occupiedAt: null,
    });

    return res.status(201).json(place);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "This code already exists for this business/type.",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/* =========================
   GENERATE TABLES (1...N)
========================= */
exports.generatePlaces = async (req, res) => {
  try {
    const { businessId, type, total } = req.body;

    if (!businessId) {
      return res.status(400).json({ message: "businessId required" });
    }

    if (type !== "table") {
      return res.status(400).json({
        message: "Kjo metodë është vetëm për tavolina",
      });
    }

    const totalNumber = Number(total);

    if (!Number.isInteger(totalNumber) || totalNumber <= 0) {
      return res.status(400).json({
        message: "Vendos një numër të saktë",
      });
    }

    // 🔥 fshin tavolinat ekzistuese
    await Place.deleteMany({ businessId, type: "table" });

    const tables = [];

    for (let i = 1; i <= totalNumber; i++) {
      const code = String(i);

      tables.push({
        businessId,
        type: "table",
        code,
        codeNormalized: code.toUpperCase(),
        qrToken: makeToken(12),
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
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/* =========================
   TOGGLE ACTIVE
========================= */
exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const place = await Place.findByIdAndUpdate(
      id,
      { isActive: !!isActive },
      { new: true }
    );

    if (!place) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.json(place);
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/* =========================
   OCCUPY PLACE
   kur kamarieri zgjedh tavolinën
========================= */
exports.occupyPlace = async (req, res) => {
  try {
    const { id } = req.params;
    const { waiterId } = req.body;

    if (!waiterId) {
      return res.status(400).json({ message: "waiterId required" });
    }

    const place = await Place.findById(id);

    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    if (!place.isActive) {
      return res.status(400).json({ message: "Place is inactive" });
    }

    if (place.isOccupied && String(place.occupiedByWaiterId) !== String(waiterId)) {
      return res.status(409).json({
        message: "Place is already occupied by another waiter",
      });
    }

    place.isOccupied = true;
    place.occupiedByWaiterId = waiterId;
    place.occupiedAt = new Date();

    await place.save();

    return res.json(place);
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/* =========================
   RELEASE PLACE
========================= */
exports.releasePlace = async (req, res) => {
  try {
    const { id } = req.params;

    const place = await Place.findById(id);

    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    place.isOccupied = false;
    place.occupiedByWaiterId = null;
    place.occupiedAt = null;

    await place.save();

    return res.json(place);
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const crypto = require("crypto");
const GuestSession = require("../models/GuestSession");

exports.getByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const place = await Place.findOne({ qrToken: token }).lean();

    if (!place) {
      return res.status(404).json({ message: "Invalid QR" });
    }

    if (place.isActive === false) {
      return res.status(403).json({ message: "QR inactive" });
    }

    // 🔥 krijo session 15 min
    const sessionToken = crypto.randomBytes(24).toString("hex");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    const sourceType =
      place.type === "room"
        ? "dhoma"
        : place.type === "umbrella"
        ? "cadra"
        : "tavoline";

    await GuestSession.create({
      token: sessionToken,
      businessId: place.businessId,
      placeId: place._id,
      sourceType,
      sourceNumber: String(place.code || "").trim(),
      expiresAt,
      lastSeenAt: now,
      active: true,
    });
    console.log("GET BY TOKEN NEW RESPONSE", {
  hasPlace: !!place,
  sessionToken,
  expiresAt,
  businessId: place.businessId,
  sourceType,
  sourceNumber: String(place.code || "").trim(),
});

    return res.json({
      place,
      sessionToken,
      expiresAt,
      businessId: place.businessId,
      sourceType,
      sourceNumber: String(place.code || "").trim(),
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};