// scripts/migrate-counters-and-ttl.js
//
// Script migrimi NJË-HERËSH. Ekzekutohet një herë para/gjatë deploy-it të ri:
//
//   cd backend
//   node scripts/migrate-counters-and-ttl.js
//
// Çfarë bën:
//   1) Heq indeksin TTL nga koleksioni "orders" (MongoDB po fshinte porositë
//      pas 30 ditësh — heqja nga skema NUK e heq indeksin ekzistues në DB).
//   2) Inicializon counter-at e faturave për çdo biznes me numrin maksimal
//      aktual të invoiceNumber, që faturat të vazhdojnë nga aty ku janë
//      dhe të mos rinisin nga 1.
//
// Është idempotent — mund të ekzekutohet edhe dy herë pa bërë dëm.

import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

import Order from "../models/Order.js";
import Counter from "../models/Counter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lexo .env e backend-it (si te server.js)
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function dropOrderTtlIndex() {
  const coll = mongoose.connection.db.collection("orders");
  const indexes = await coll.indexes();

  const ttlIndexes = indexes.filter(
    (idx) => idx.expireAfterSeconds !== undefined
  );

  if (ttlIndexes.length === 0) {
    console.log("✅ TTL: s'ka indeks TTL te 'orders' — asgjë për të hequr.");
    return;
  }

  for (const idx of ttlIndexes) {
    await coll.dropIndex(idx.name);
    console.log(
      `🗑️  TTL: u hoq indeksi "${idx.name}" (expireAfterSeconds=${idx.expireAfterSeconds}).`
    );
  }
}

async function initInvoiceCounters() {
  // Numri maksimal i faturës për çdo biznes
  const maxima = await Order.aggregate([
    { $match: { invoiceNumber: { $ne: null } } },
    {
      $group: {
        _id: "$businessId",
        maxInvoice: { $max: "$invoiceNumber" },
      },
    },
  ]);

  if (maxima.length === 0) {
    console.log("✅ Counters: s'ka porosi ekzistuese — s'ka çfarë inicializohet.");
    return;
  }

  for (const { _id: businessId, maxInvoice } of maxima) {
    if (!businessId) continue;

    const seq = Number(maxInvoice) || 0;

    // $max: nëse counter-i ekziston dhe është më i madh, nuk e ul —
    // kjo e bën script-in të sigurt për ri-ekzekutim.
    await Counter.findOneAndUpdate(
      { businessId, name: "invoice" },
      { $max: { seq } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    console.log(`🔢 Counter: business=${businessId} → seq=${seq}`);
  }

  console.log(`✅ Counters: u inicializuan ${maxima.length} biznese.`);
}

async function main() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ MONGO_URI mungon në .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("🔌 U lidh me MongoDB.");

  try {
    await dropOrderTtlIndex();
    await initInvoiceCounters();
    console.log("🎉 Migrimi përfundoi me sukses.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Migrimi dështoi:", err);
  process.exit(1);
});