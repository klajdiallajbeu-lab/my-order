// controllers/placeController.js
const Place = require("../models/Place");
const makeToken = require("../utils/makeToken");

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

exports.listPlaces = async (req, res) => {
  try {
    const { businessId, type } = req.query;
    if (!businessId) return res.status(400).json({ message: "businessId required" });
    if (!type || !["room", "umbrella"].includes(type))
      return res.status(400).json({ message: "type must be room|umbrella" });

    const places = await Place.find({ businessId, type }).sort({ codeNormalized: 1 }).lean();
    res.json(places);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.createPlace = async (req, res) => {
  try {
    const { businessId, type, code } = req.body;
    if (!businessId) return res.status(400).json({ message: "businessId required" });
    if (!type || !["room", "umbrella"].includes(type))
      return res.status(400).json({ message: "type must be room|umbrella" });

    const codeNormalized = normalizeCode(code);
    if (!codeNormalized) return res.status(400).json({ message: "code required" });

    // basic validation: vetëm A-Z 0-9 dhe - (opsionale)
    if (!/^[A-Z0-9-]+$/.test(codeNormalized))
      return res.status(400).json({ message: "Invalid code format" });

    const place = await Place.create({
      businessId,
      type,
      code: String(code).trim(),
      codeNormalized,
      qrToken: makeToken(12),
    });

    res.status(201).json(place);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "This code already exists for this business/type." });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const place = await Place.findByIdAndUpdate(
      id,
      { isActive: !!isActive },
      { new: true }
    );

    if (!place) return res.status(404).json({ message: "Not found" });
    res.json(place);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const place = await Place.findOne({ qrToken: token }).lean();

    if (!place) return res.status(404).json({ message: "Invalid QR" });
    if (place.isActive === false) return res.status(403).json({ message: "QR inactive" });

    res.json(place);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
