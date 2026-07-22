import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sharp from "sharp";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteCategoryFromProducts,
  deleteSubCategoryFromProducts,
} from "../controllers/productController.js";

import { protectUser, requireRole } from "../middleware/protectUser.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "..", "uploads", "products");
fs.mkdirSync(uploadDir, { recursive: true });

// Tani foto mbahet përkohësisht në memorje (RAM), jo në disk direkt —
// kështu mund ta procesojmë me sharp para se ta ruajmë.
const storage = multer.memoryStorage();

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
   PUBLIC
========================= */

// Menuja QR ka nevojë ta lexojë menunë
router.get("/", getProducts);

/* =========================
   PROTECTED MANAGER / ADMIN
========================= */

router.post(
  "/upload-image",
  protectUser,
  requireRole("manager", "admin"),
  (req, res) => {
    upload.single("image")(req, res, async (err) => {
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

      try {
        const baseName = `product-${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}`;

        const fullFilename = `${baseName}.webp`;
        const thumbFilename = `${baseName}-thumb.webp`;

        const fullPath = path.join(uploadDir, fullFilename);
        const thumbPath = path.join(uploadDir, thumbFilename);

        // Foto kryesore — max 800x800, WebP, cilësi 80%
        await sharp(req.file.buffer)
          .rotate() // respekton EXIF orientation (foto nga telefoni s'del e rrotulluar)
          .resize(800, 800, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toFile(fullPath);

          await sharp(req.file.buffer)
            .rotate()
            // Sfond i bardhë për PNG transparente
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .resize(600, 600, {
              fit: "cover",
              position: sharp.strategy.attention,
              background: { r: 255, g: 255, b: 255 },
            })
            .webp({ quality: 80 })
            .toFile(thumbPath);

        const imageUrl = `/uploads/products/${fullFilename}`;
        const thumbnailUrl = `/uploads/products/${thumbFilename}`;

        return res.json({
          success: true,
          imageUrl,
          thumbnailUrl,
        });
      } catch (procErr) {
        console.error("Image processing error:", procErr);
        return res.status(500).json({
          message: "Image processing failed",
        });
      }
    });
  }
);

router.post("/", protectUser, requireRole("manager", "admin"), createProduct);

router.delete(
  "/category",
  protectUser,
  requireRole("manager", "admin"),
  deleteCategoryFromProducts
);

router.delete(
  "/subcategory",
  protectUser,
  requireRole("manager", "admin"),
  deleteSubCategoryFromProducts
);

router.put("/:id", protectUser, requireRole("manager", "admin"), updateProduct);

router.delete(
  "/:id",
  protectUser,
  requireRole("manager", "admin"),
  deleteProduct
);

export default router;