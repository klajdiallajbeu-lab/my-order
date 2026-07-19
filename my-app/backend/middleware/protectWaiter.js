import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Waiter from "../models/Waiter.js";

export const protectWaiter = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Nuk je i autorizuar." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "waiter") {
      return res.status(403).json({ message: "Akses i ndaluar." });
    }

    let waiter = await User.findOne({
      _id: decoded.id,
      role: "waiter",
    });

    if (!waiter) {
      waiter = await Waiter.findById(decoded.id);
    }

    if (!waiter) {
      return res.status(401).json({
        message: "Kamarieri nuk ekziston.",
      });
    }

    if (waiter.isActive === false) {
      return res.status(401).json({
        message: "Kamarieri është çaktivizuar.",
      });
    }

    req.user = decoded;
    req.waiter = waiter;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Token i pavlefshëm ose ka skaduar.",
    });
  }
};