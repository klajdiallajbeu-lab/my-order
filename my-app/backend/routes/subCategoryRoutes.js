import express from "express";
import { 
  getSubCategories, 
  createSubCategory, 
  updateSubCategory,   // ✅ SHTO KETE
  deleteSubCategory 
} from "../controllers/subCategoryController.js";

const router = express.Router();

// LIST
router.get("/", getSubCategories);

// CREATE
router.post("/", createSubCategory);

// UPDATE  ✅ KJO MUNGONTE
router.patch("/:id", updateSubCategory);

// DELETE
router.delete("/:id", deleteSubCategory);

export default router;
