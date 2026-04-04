import Business from "../models/Business.js";
import { getTodayTirane, generateRandomPin } from "../utils/pinUtils.js";

export async function guestGuardIfClient(req, res, next) {
  if (req.body?.fromClient !== true) return next();

  const { businessId } = req.body;
  if (!businessId) return res.status(400).json({ message: "Missing businessId" });

  try {
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: "Biznesi nuk ekziston." });

    if (business.orderPin?.enabled === false) {
      return res.status(403).json({ message: "PIN është i çaktivizuar." });
    }

    const today = getTodayTirane();
    const savedDay = String(business.orderPin?.day || "");
    let currentPin = String(business.orderPin?.code || "").trim().toUpperCase();

    if (!currentPin || savedDay !== today) {
      currentPin = generateRandomPin();
      business.orderPin = { code: currentPin, day: today, enabled: true };
      await business.save();
    }

    const clientPin = String(req.headers["x-order-pin"] || "").trim().toUpperCase();
    if (!clientPin) return res.status(401).json({ message: "Kërkohet PIN i ditës." });

    if (clientPin !== currentPin) {
      return res.status(403).json({ message: "PIN i gabuar." });
    }

    return next();
  } catch (err) {
    console.error("guestGuardIfClient error:", err);
    return res.status(500).json({ message: "Gabim serveri." });
  }
}
