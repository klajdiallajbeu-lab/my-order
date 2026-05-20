import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteCategoryFromProducts,
  deleteSubCategoryFromProducts,
} from "../controllers/productController.js";

const router = express.Router();

/* =========================
   SAFE PATH FOR UPLOADS
========================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// routes/../uploads/products => backend/uploads/products
const uploadDir = path.join(__dirname, "..", "uploads", "products");

fs.mkdirSync(uploadDir, { recursive: true });

console.log("UPLOAD DIR:", uploadDir);

/* =========================
   MULTER CONFIG
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    cb(
      null,
      `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});

/* =========================
   IMAGE UPLOAD
========================= */

router.post("/upload-image", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("Multer upload error:", err);

      return res.status(400).json({
        message: err.message || "Image upload failed",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const imageUrl = `/uploads/products/${req.file.filename}`;

    return res.json({
      success: true,
      imageUrl,
    });
  });
});

/* =========================
   PRODUCTS
========================= */

router.get("/", getProducts);
router.post("/", createProduct);

/* IMPORTANT: before /:id */
router.delete("/category", deleteCategoryFromProducts);
router.delete("/subcategory", deleteSubCategoryFromProducts);

router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;