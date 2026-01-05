import express from "express";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteCategoryFromProducts,
  deleteSubCategoryFromProducts,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts);
router.post("/", createProduct);

// ✅ KETO DUHET PARA /:id
router.delete("/category", deleteCategoryFromProducts);
router.delete("/subcategory", deleteSubCategoryFromProducts);

router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
