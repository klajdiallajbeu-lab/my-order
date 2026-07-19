import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Nuk je i autorizuar.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "printer") {
  req.user = {
    id: String(decoded.id),
    businessId: String(decoded.businessId),
    role: "printer",
    name: "myOrder Printer",
  };

  return next();
}

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Useri nuk ekziston.",
      });
    }

    req.user = {
      id: String(user._id),
      businessId: user.businessId ? String(user.businessId) : "",
      role: user.role,
      name: user.name,
      surname: user.surname || "",
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Token i pavlefshëm ose ka skaduar.",
    });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Nuk ke akses për këtë veprim.",
      });
    }

    next();
  };
};