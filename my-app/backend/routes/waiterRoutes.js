import express from "express";
import bcrypt from "bcrypt";
import Waiter from "../models/Waiter.js";
import jwt from "jsonwebtoken";
import { loginLimiter } from "../middleware/loginLimiter.js";

const router = express.Router();

// KRIJO KAMARJER – thirret nga ManagerPage
router.post("/", async (req, res) => {
  try {
    const { businessId, name, username, password } = req.body;

    if (!businessId || !name || !username || !password) {
      return res
        .status(400)
        .json({ message: "Plotëso të gjitha fushat" });
    }

    const exists = await Waiter.findOne({ username });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Ky username ekziston tashmë" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const waiter = await Waiter.create({
      businessId,
      name,
      username,
      passwordHash,
    });

    res.status(201).json({
      message: "Kamarjeri u krijua me sukses",
      waiterId: waiter._id,
    });
  } catch (err) {
    console.error("Gabim POST /api/waiters:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
});

// LOGIN i kamarjerit (përfaqson atë që folëm për WaiterLoginPage)
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    const waiter = await Waiter.findOne({ username });
    if (!waiter) {
      return res.status(401).json({ message: "Kredencialet janë të pasakta" });
    }

    const ok = await bcrypt.compare(password, waiter.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Kredencialet janë të pasakta" });
    }

    if (!waiter.isActive) {
      return res
        .status(403)
        .json({ message: "Ky kamarjer është çaktivizuar nga menaxheri" });
    }

    const token = jwt.sign(
  {
    id: waiter._id,
    businessId: waiter.businessId,
    role: "waiter",
    name: waiter.name,
  },
  process.env.JWT_SECRET,
  { expiresIn: "12h" }
);

    res.json({
      message: "Hyrja u krye me sukses",
      waiterId: waiter._id,
      name: waiter.name,
      token: token,
      businessId: waiter.businessId,
      role: "waiter",
    });
  } catch (err) {
    console.error("Gabim POST /api/waiters/login:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
});

export default router;
