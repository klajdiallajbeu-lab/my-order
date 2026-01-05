// controllers/orderController.js
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Business from "../models/Business.js";
import Product from "../models/Product.js";
import SubCategory from "../models/SubCategory.js";


/* helpers */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* ============================================================
   GET /api/orders?businessId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
   ============================================================ */
export const getOrders = async (req, res) => {
  try {
    const { businessId, from, to, sourceType } = req.query;

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }
    if (!isValidObjectId(businessId)) {
      return res.status(400).json({ message: "businessId nuk është ObjectId valid" });
    }

    const filter = { businessId };

    // ✅ FILTRIM sipas burimit (tavoline/dhoma/cadra)
    if (sourceType && ["tavoline", "dhoma", "cadra"].includes(String(sourceType).toLowerCase())) {
      filter.sourceType = String(sourceType).toLowerCase();
    }

    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from + "T00:00:00"),
        $lte: new Date(to + "T23:59:59"),
      };
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(orders);
  } catch (err) {
    console.error("❌ Gabim te getOrders:", err);
    return res.status(500).json({ message: "Gabim serveri", error: err.message });
  }
};


/* ============================================================
   GET /api/orders/:id
   ============================================================ */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "id nuk është ObjectId valid" });
    }

    const order = await Order.findById(id).lean();

    if (!order) {
      return res.status(404).json({ message: "Fatura nuk u gjet" });
    }

    return res.json(order);
  } catch (err) {
    console.error("❌ Gabim te getOrderById:", err);
    return res.status(500).json({ message: "Gabim serveri", error: err.message });
  }
};

/* ============================================================
   POST /api/orders
   ============================================================ */
export const createOrder = async (req, res) => {
  try {
    console.log("📥 BODY /api/orders:", req.body);

    const { businessId, sourceType, sourceNumber, items, total, createdBy } = req.body;

    if (!businessId || !sourceType || !sourceNumber) {
      return res.status(400).json({
        message: "businessId, sourceType, sourceNumber janë të detyrueshme",
      });
    }
    if (!isValidObjectId(businessId)) {
      return res.status(400).json({ message: "businessId nuk është ObjectId valid" });
    }

    const st = String(sourceType).toLowerCase();
    const allowedSource = ["tavoline", "dhoma", "cadra"];
    if (!allowedSource.includes(st)) {
      return res.status(400).json({ message: "sourceType i pavlefshëm" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items janë të detyrueshme" });
    }

    const business = await Business.findById(businessId).lean();
    if (!business) return res.status(404).json({ message: "Biznesi nuk ekziston më." });

    const now = new Date();
    if (business.endDate && new Date(business.endDate) < now) {
      return res.status(403).json({ message: "Ky biznes ka skaduar dhe nuk pranon më porosi." });
    }

    const cleanItems = items
      .map((it) => ({
        productId: isValidObjectId(it.productId) ? it.productId : null,
        name: String(it.name || "").trim(),
        price: safeNum(it.price, 0),
        qty: safeNum(it.qty ?? it.quantity, 0),
      }))
      .filter((it) => it.name && it.qty > 0);

    if (cleanItems.length === 0) {
      return res.status(400).json({ message: "items nuk kanë të dhëna valide" });
    }

    // ===== 1) Merr produktet (categoryType + subCategory) =====
    const productIds = cleanItems.map((x) => x.productId).filter(Boolean);

    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds }, businessId })
          .select("_id categoryType subCategory")
          .lean()
      : [];

    const prodMap = new Map(products.map((p) => [String(p._id), p]));

    // default nëse s’gjen destination në SubCategory
    const defaultDestByCategoryType = (ct) => {
      const t = String(ct || "").toLowerCase().trim();
      if (t === "pije") return "banak";
      return "kuzhine";
    };

    // ===== 2) Merr SubCategory docs për destination =====
    const subKeys = [];
    for (const p of products) {
      const ct = String(p.categoryType || "").trim().toLowerCase();
      const sc = String(p.subCategory || "").trim();
      if (ct && sc) subKeys.push({ ct, sc });
    }

    let subDocs = [];
    if (subKeys.length) {
      const ors = subKeys.map(({ ct, sc }) => ({
        businessId,
        categoryType: ct,
        $or: [{ name: sc }, { nameSq: sc }],
      }));

      subDocs = await SubCategory.find({ $or: ors })
        .select("businessId categoryType name nameSq destination") // ✅ destination
        .lean();
    }

    const subMap = new Map();
    for (const s of subDocs) {
      const ct = String(s.categoryType || "").trim().toLowerCase();
      const nm = String(s.nameSq || s.name || "").trim();
      const destRaw = String(s.destination || "").toLowerCase().trim();
      const dest = destRaw === "banak" ? "banak" : "kuzhine";
      subMap.set(`${ct}||${nm}`, dest);
    }

    // ===== 3) Vendos destination për çdo item =====
    const itemsWithDest = cleanItems.map((it) => {
      if (!it.productId) return { ...it, destination: "kuzhine" };

      const p = prodMap.get(String(it.productId));
      const ct = String(p?.categoryType || "").trim().toLowerCase();
      const sc = String(p?.subCategory || "").trim();

      const fromSub = subMap.get(`${ct}||${sc}`);
      const destination = fromSub || defaultDestByCategoryType(ct);

      return { ...it, destination };
    });

    // ===== 4) Split =====
    const kuzhineItems = itemsWithDest.filter((x) => x.destination === "kuzhine");
    const banakItems = itemsWithDest.filter((x) => x.destination === "banak");

    const mkTotal = (arr) => arr.reduce((sum, it) => sum + it.price * it.qty, 0);

    const batchId =
      kuzhineItems.length && banakItems.length
        ? new mongoose.Types.ObjectId().toString()
        : "";

    const createdBySafe = createdBy || "Klient (QR)";
    const sourceNumberSafe = String(sourceNumber).trim();

    const createdOrders = [];

    if (kuzhineItems.length) {
      createdOrders.push(
        await Order.create({
          businessId,
          sourceType: st,
          sourceNumber: sourceNumberSafe,
          items: kuzhineItems.map(({ destination, ...rest }) => rest),
          total: mkTotal(kuzhineItems),
          createdBy: createdBySafe,
          status: "pending",
          destination: "kuzhine",
          batchId,
        })
      );
    }

    if (banakItems.length) {
      createdOrders.push(
        await Order.create({
          businessId,
          sourceType: st,
          sourceNumber: sourceNumberSafe,
          items: banakItems.map(({ destination, ...rest }) => rest),
          total: mkTotal(banakItems),
          createdBy: createdBySafe,
          status: "pending",
          destination: "banak",
          batchId,
        })
      );
    }

    if (createdOrders.length === 0) {
      return res.status(400).json({ message: "Nuk u krijua asnjë porosi (items bosh)." });
    }

    // ✅ REAL-TIME
    const io = req.app.get("io");
    for (const o of createdOrders) {
      io?.to(`business:${businessId}`).emit("orders:created", {
        businessId,
        orderId: o._id.toString(),
        sourceType: o.sourceType,
        sourceNumber: o.sourceNumber,
        status: o.status,
        destination: o.destination,
        batchId: o.batchId || "",
        createdAt: o.createdAt,
      });
    }
    io?.to(`business:${businessId}`).emit("orders:changed", { businessId });

    return res.status(201).json(createdOrders.length === 1 ? createdOrders[0] : createdOrders);
  } catch (err) {
    console.error("❌ Gabim te createOrder:", err);
    return res.status(500).json({ message: "Gabim serveri", error: err.message });
  }
};




/* ============================================================
   PATCH /api/orders/:id/status
   ============================================================ */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, acceptedBy } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "id nuk është ObjectId valid" });
    }

    const allowed = ["pending", "accepted", "done"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: "status i pavlefshëm" });
    }

    const update = { status };
    if (status === "accepted") update.acceptedBy = acceptedBy || "";
    // në done s’e prekim acceptedBy

    const order = await Order.findByIdAndUpdate(id, update, { new: true }).lean();

    if (!order) {
      return res.status(404).json({ message: "Porosia nuk u gjet" });
    }

    return res.json(order);
  } catch (err) {
    console.error("❌ Gabim te updateOrderStatus:", err);
    return res.status(500).json({ message: "Gabim serveri", error: err.message });
  }
};
