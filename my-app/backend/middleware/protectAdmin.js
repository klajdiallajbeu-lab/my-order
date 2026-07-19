import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export const protectAdmin = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Nuk je i autorizuar",
      });
    }

    const token = auth.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Token mungon",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET mungon në server");
      return res.status(500).json({
        message: "Gabim konfigurimi në server",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id || decoded.role !== "admin") {
      return res.status(403).json({
        message: "Akses i ndaluar",
      });
    }

    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(401).json({
        message: "Admini nuk ekziston",
      });
    }

    req.admin = admin;
    next();
  } catch (err) {
    console.error("Gabim protectAdmin:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token-i ka skaduar",
      });
    }

    return res.status(401).json({
      message: "Token i pavlefshëm",
    });
  }
};