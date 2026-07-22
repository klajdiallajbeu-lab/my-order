// scripts/generateThumbnailsHD.js
//
// Rigjeneron thumbnails ne cilesi te larte (600x600) per TE GJITHA produktet,
// pavaresisht nese kane thumbnail apo jo. Emri i ri "-thumb600.webp" siguron
// qe shfletuesit te mos perdorin nga cache thumbnail-et e vjetra 200px.
//
//   cd backend
//   node scripts/generateThumbnailsHD.js         # ekzekutim real
//   node scripts/generateThumbnailsHD.js --dry   # vetem tregon, s'ndryshon gje

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import sharp from "sharp";

import Product from "../models/Product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const UPLOADS_DIR = path.join(__dirname, "..", "uploads", "products");
const DRY = process.argv.includes("--dry");

const SIZE = 600;      // 600x600 — i mprehte edhe ne ekrane 3x
const QUALITY = 80;

// Merr cilendo fushe foto qe ka produkti
function pickImageField(p) {
  return p.image || p.imageUrl || p.photoUrl || "";
}

// Nga "/uploads/products/emri.png" ose URL e plote -> "emri.png"
function toFilename(val) {
  if (!val) return "";
  try {
    const clean = String(val).split("?")[0];
    return path.basename(clean);
  } catch {
    return "";
  }
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI mungon në .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("🔌 U lidh me MongoDB.");

  const products = await Product.find({
    $or: [
      { image: { $exists: true, $ne: "" } },
      { imageUrl: { $exists: true, $ne: "" } },
      { photoUrl: { $exists: true, $ne: "" } },
    ],
  }).lean();

  console.log(`📦 ${products.length} produkte me foto. Madhësia: ${SIZE}x${SIZE}${DRY ? " (DRY RUN)" : ""}`);

  let ok = 0, skipped = 0, failed = 0;

  for (const p of products) {
    const srcName = toFilename(pickImageField(p));
    if (!srcName) { skipped++; continue; }

    const srcPath = path.join(UPLOADS_DIR, srcName);
    if (!fs.existsSync(srcPath)) {
      console.log(`⚠️  Mungon file: ${srcName} (${p.name || p._id})`);
      failed++;
      continue;
    }

    const base = srcName.replace(path.extname(srcName), "");
    const thumbName = `${base}-thumb600.webp`;
    const thumbPath = path.join(UPLOADS_DIR, thumbName);
    const thumbUrl = `/uploads/products/${thumbName}`;

    if (DRY) {
      console.log(`DRY: ${p.name || p._id} -> ${thumbName}`);
      ok++;
      continue;
    }

    try {
      await sharp(srcPath)
        .rotate()
        // Sfond i bardhë për PNG transparente (shishe, kanaçe)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .resize(SIZE, SIZE, {
          fit: "cover",
          position: sharp.strategy.attention,
          background: { r: 255, g: 255, b: 255 },
        })
        .webp({ quality: QUALITY })
        .toFile(thumbPath);

      await Product.updateOne(
        { _id: p._id },
        { $set: { thumbnail: thumbUrl } }
      );

      ok++;
      if (ok % 20 === 0) console.log(`   ... ${ok} të gjeneruara`);
    } catch (err) {
      console.log(`❌ Dështoi: ${srcName} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✅ U gjeneruan: ${ok} | ⚠️ U kapërcyen: ${skipped} | ❌ Dështuan: ${failed}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Gabim:", err);
  process.exit(1);
});