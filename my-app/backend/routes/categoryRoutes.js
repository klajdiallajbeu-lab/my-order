import express from "express";
import {
  getCategories,
  createCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

import { protectUser, requireRole } from "../middleware/protectUser.js";

const router = express.Router();

/* =========================
   PUBLIC
========================= */

// Menuja QR duhet t'i lexojë kategoritë
router.get("/", getCategories);

/* =========================
   PROTECTED
========================= */

router.post(
  "/",
  protectUser,
  requireRole("manager", "admin"),
  createCategory
);

router.delete(
  "/:id",
  protectUser,
  requireRole("manager", "admin"),
  deleteCategory
);

export default router;