import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export const protectAdmin = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = auth.split(" ")[1];

    const decoded = jwt.verify(token, "SECRET_KEY");

    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({ message: "Admin nuk ekziston" });
    }

    req.admin = admin;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token i pavlefshëm" });
  }
};