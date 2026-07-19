import express from "express";
import jwt from "jsonwebtoken";
import Business from "../models/Business.js";

const router = express.Router();

router.post("/connect", async (req, res) => {
  try {
    const printerKey = String(req.body?.printerKey || "")
      .trim()
      .toUpperCase();

    if (!printerKey) {
      return res.status(400).json({ message: "Printer Key mungon." });
    }

    const business = await Business.findOne({ printerKey }).lean();

    if (!business) {
      return res.status(404).json({ message: "Printer Key nuk u gjet." });
    }

    const printerToken = jwt.sign(
      {
        id: String(business._id),
        businessId: String(business._id),
        role: "printer",
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      businessId: String(business._id),
      businessName: business.name || "",
      printerKey: business.printerKey || "",
      printerToken,
      settings: business.settings || {},
    });
  } catch (err) {
    console.error("printer connect error:", err);
    return res.status(500).json({ message: "Gabim serveri." });
  }
});

export default router;