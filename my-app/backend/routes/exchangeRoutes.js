import express from "express";
import {
  getExchange,
  upsertExchange,
} from "../controllers/exchangeController.js";

import { protectUser, requireRole } from "../middleware/protectUser.js";

const router = express.Router();

/* =========================
   PUBLIC
========================= */

// Nuk ka route publike

/* =========================
   MANAGER / ADMIN
========================= */

router.get(
  "/",
  protectUser,
  requireRole("manager", "admin"),
  getExchange
);

router.put(
  "/",
  protectUser,
  requireRole("manager", "admin"),
  upsertExchange
);

export default router;