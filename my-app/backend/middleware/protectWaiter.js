import User from "../models/User.js";

export const protectWaiter = async (req, res, next) => {
  try {
    const waiterId = String(req.headers["x-waiter-id"] || "").trim();

    if (!waiterId) {
      return res.status(401).json({ message: "Waiter nuk është i autorizuar." });
    }

    const waiter = await User.findOne({
      _id: waiterId,
      role: "waiter",
    });

    if (!waiter) {
      return res.status(401).json({ message: "Kamarieri nuk ekziston." });
    }

    req.waiter = waiter;
    next();
  } catch (err) {
    console.error("protectWaiter error:", err);
    return res.status(500).json({ message: "Gabim serveri." });
  }
};