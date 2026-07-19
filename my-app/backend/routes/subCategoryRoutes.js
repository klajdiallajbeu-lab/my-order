import express from "express";
import {
  getSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "../controllers/subCategoryController.js";

import { protectUser, requireRole } from "../middleware/protectUser.js";

const router = express.Router();

/* =========================
   PUBLIC
========================= */

// Menuja QR ka nevojë të lexojë nënkategoritë
router.get("/", getSubCategories);

/* =========================
   PROTECTED
========================= */

// CREATE
router.post(
  "/",
  protectUser,
  requireRole("manager", "admin"),
  createSubCategory
);

// UPDATE
router.put(
  "/:id",
  protectUser,
  requireRole("manager", "admin"),
  updateSubCategory
);

router.patch(
  "/:id",
  protectUser,
  requireRole("manager", "admin"),
  updateSubCategory
);

// DELETE
router.delete(
  "/:id",
  protectUser,
  requireRole("manager", "admin"),
  deleteSubCategory
);

export default router;