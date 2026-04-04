import express from "express";
import {
  getSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "../controllers/subCategoryController.js";

const router = express.Router();

// LIST
router.get("/", getSubCategories);

// CREATE
router.post("/", createSubCategory);

// UPDATE ✅ prano PUT dhe PATCH
router.put("/:id", updateSubCategory);
router.patch("/:id", updateSubCategory);

// DELETE
router.delete("/:id", deleteSubCategory);

export default router;
