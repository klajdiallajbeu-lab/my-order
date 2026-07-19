import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Waiter from "../models/Waiter.js";

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = null;

    if (decoded.role === "waiter") {
      user =
        (await Waiter.findById(decoded.id).select("-passwordHash")) ||
        (await User.findById(decoded.id).select("-password"));
    } else {
      user = await User.findById(decoded.id).select("-password");
    }

    if (user) {
      req.user = {
        id: String(user._id),
        businessId: user.businessId ? String(user.businessId) : "",
        role: decoded.role || user.role,
        name: user.name || decoded.name || "",
      };

      if (req.user.role === "waiter") {
        req.waiter = user;
      }
    }

    next();
  } catch {
    next();
  }
};