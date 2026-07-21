// backend/scripts/generateThumbnails.js
//
// Script migrimi një-herësh: gjen të gjitha produktet që kanë `image`
// (foto e plotë) por s'kanë `thumbnail`, gjeneron një thumbnail WebP
//200x200 nga foto origjinale në disk, e ruan te uploads/products/,
// dhe përditëson dokumentin e produktit në databazë.
//
// PËRDORIMI (nga backend/):
//   node scripts/generateThumbnails.js
//
// (opsionale) --dry  → vetëm tregon çfarë do të bënte, pa shkruar asgjë
//   node scripts/generateThumbnails.js --dry

import "dotenv/config";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scripts/ është një nivel brenda backend/, kështu që backend root = ..
const backendRoot = path.join(__dirname, "..");
const uploadDir = path.join(backendRoot, "uploads", "products");

const DRY_RUN = process.argv.includes("--dry");

// Ndrysho këtë path nëse modeli Product ndodhet diku tjetër
const Product = (await import(path.join(backendRoot, "models", "Product.js"))).default;

const urlToDiskPath = (url) => {
  // p.sh. "/uploads/products/product-123.png" -> ".../backend/uploads/products/product-123.png"
  if (!url) return null;
  const clean = String(url).replace(/^\/?uploads\//, "");
  return path.join(backendRoot, "uploads", clean);
};

async function run() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ MONGO_URI mungon në .env");
    process.exit(1);
  }

  await mongoose.connect(uri, { autoIndex: false });
  console.log("✅ Lidhur me MongoDB");

  const products = await Product.find({
    image: { $exists: true, $ne: "" },
    $or: [
      { thumbnail: { $exists: false } },
      { thumbnail: "" },
      { thumbnail: null },
    ],
  }).lean();

  console.log(`🔍 U gjetën ${products.length} produkte pa thumbnail.\n`);

  let done = 0;
  let skippedNoFile = 0;
  let failed = 0;

  for (const p of products) {
    const srcPath = urlToDiskPath(p.image);

    if (!srcPath || !fs.existsSync(srcPath)) {
      console.warn(`⚠️  SKIP (file s'ekziston në disk): ${p.name} -> ${p.image}`);
      skippedNoFile++;
      continue;
    }

    const baseName = path.basename(srcPath, path.extname(srcPath));
    const thumbFilename = `${baseName}-thumb.webp`;
    const thumbPath = path.join(uploadDir, thumbFilename);
    const thumbnailUrl = `/uploads/products/${thumbFilename}`;

    try {
      if (!DRY_RUN) {

        await sharp(srcPath)
          .rotate()
          // Sfond i bardhë për PNG transparente (p.sh. shishe pijesh),
          // që të mos dalë sfond i zi/transparent në kornizë.
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .resize(200, 200, {
            fit: "cover",
            position: sharp.strategy.attention,
            background: { r: 255, g: 255, b: 255 },
          })
          .webp({ quality: 78 })
          .toFile(thumbPath);

        await Product.updateOne(
          { _id: p._id },
          { $set: { thumbnail: thumbnailUrl } }
        );
      }

      console.log(
        `✅ ${DRY_RUN ? "[DRY] " : ""}${p.name} -> ${thumbnailUrl}`
      );
      done++;
    } catch (err) {
      console.error(`❌ GABIM te ${p.name} (${p.image}):`, err.message);
      failed++;
    }
  }

  console.log("\n===== PËRFUNDOI =====");
  console.log(`✅ Thumbnail të krijuara: ${done}`);
  console.log(`⚠️  Të kapërcyera (file s'u gjet): ${skippedNoFile}`);
  console.log(`❌ Dështuan: ${failed}`);

  if (DRY_RUN) {
    console.log("\n(Ky ishte --dry run, s'u shkrua asgjë. Rifute komandën pa --dry për ta zbatuar.)");
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Gabim fatal:", err);
  process.exit(1);
});