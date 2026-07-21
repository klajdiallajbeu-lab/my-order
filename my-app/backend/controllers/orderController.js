import mongoose from "mongoose";
import Order from "../models/Order.js";
import Business from "../models/Business.js";
import Product from "../models/Product.js";
import SubCategory from "../models/SubCategory.js";
import GuestSession from "../models/GuestSession.js";
import { getNextSequence } from "../models/Counter.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const ALLOWED_CURRENCIES = ["ALL", "EUR", "USD", "CHF", "GBP"];
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const convertFromALL = (amountAll, currency, settings = {}) => {
  const amount = safeNum(amountAll, 0);
  const curr = String(currency || "ALL").toUpperCase();

  if (curr === "ALL") return round2(amount);

  const rateMap = {
    EUR: safeNum(settings.eurRate, 0),
    USD: safeNum(settings.usdRate, 0),
    CHF: safeNum(settings.chfRate, 0),
    GBP: safeNum(settings.gbpRate, 0),
  };

  const rate = rateMap[curr];
  if (!Number.isFinite(rate) || rate <= 0) return round2(amount);

  return round2(amount / rate);
};

export const getOrders = async (req, res) => {
  try {
    const { from, to, sourceType } = req.query;

    const role = String(req.user?.role || "").toLowerCase();

    const businessId =
      role === "admin"
        ? String(req.query.businessId || "").trim()
        : String(req.user?.businessId || "").trim();

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }

    if (!isValidObjectId(businessId)) {
      return res.status(400).json({ message: "businessId nuk është ObjectId valid" });
    }

    const filter = { businessId };

    if (
      sourceType &&
      ["tavoline", "dhoma", "cadra"].includes(String(sourceType).toLowerCase())
    ) {
      filter.sourceType = String(sourceType).toLowerCase();
    }

    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from + "T00:00:00"),
        $lte: new Date(to + "T23:59:59"),
      };
    }

    const orders = await Order.find(filter)
      .populate("businessId")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(
      orders.map((order) => ({
        ...order,
        business: order.businessId || null,
      }))
    );
  } catch (err) {
    console.error("❌ Gabim te getOrders:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "id nuk është ObjectId valid" });
    }

    const order = await Order.findById(id).populate("businessId").lean();

    if (!order) {
      return res.status(404).json({ message: "Fatura nuk u gjet" });
    }

    const role = String(req.user?.role || "").toLowerCase();
    const orderBusinessId = String(order.businessId?._id || order.businessId || "");
    const userBusinessId = String(req.user?.businessId || "");

    if (role !== "admin" && orderBusinessId !== userBusinessId) {
      return res.status(403).json({ message: "Nuk ke akses për këtë faturë." });
    }

    return res.json({
      ...order,
      business: order.businessId || null,
    });
  } catch (err) {
    console.error("❌ Gabim te getOrderById:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

export const createOrder = async (req, res) => {
  try {
    console.log("📥 BODY /api/orders:", req.body);

    console.log("📦 WAITER DEBUG:", {
  createdBy: req.body.createdBy,
  waiterId: req.body.waiterId,
  waiterName: req.body.waiterName,
  acceptedByName: req.body.acceptedByName,
});

    const {
  businessId,
  sourceType,
  sourceNumber,
  items,
  createdBy,
  waiterId,
  waiterName,
  note,
  orderNote,
} = req.body;

const tokenBusinessId = String(req.user?.businessId || "");
const tokenWaiterId = String(req.user?.id || "");
const tokenWaiterName = String(req.user?.name || "");

const finalBusinessId = tokenBusinessId || businessId;
const finalWaiterId = tokenWaiterId || waiterId || "";
const finalWaiterName =
  tokenWaiterName ||
  waiterName ||
  createdBy ||
  "Klient (QR)";

    const noteSafe = String(note || orderNote || "").trim();

    if (!finalBusinessId || !sourceType || !sourceNumber) {
      return res.status(400).json({
        message: "businessId, sourceType, sourceNumber janë të detyrueshme",
      });
    }

    if (!isValidObjectId(finalBusinessId)) {
      return res.status(400).json({
        message: "businessId nuk është ObjectId valid",
      });
    }

    const st = String(sourceType).toLowerCase();

    if (!["tavoline", "dhoma", "cadra"].includes(st)) {
      return res.status(400).json({ message: "sourceType i pavlefshëm" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items janë të detyrueshme" });
    }

    const business = await Business.findById(finalBusinessId).lean();

    if (!business) {
      return res.status(404).json({ message: "Biznesi nuk ekziston më." });
    }

    const now = new Date();

    if (business.endDate && new Date(business.endDate) < now) {
      return res.status(403).json({
        message: "Ky biznes ka skaduar dhe nuk pranon më porosi.",
      });
    }

    const settings = business?.settings || {};

    const currency = ALLOWED_CURRENCIES.includes(settings.baseCurrency)
      ? settings.baseCurrency
      : "ALL";

    const rawItems = items
      .map((it) => ({
        productId: isValidObjectId(it.productId) ? String(it.productId) : "",
        qty: safeNum(it.qty ?? it.quantity, 0),
        price: it.price === undefined ? undefined : safeNum(it.price, 0),
      }))
      .filter((it) => it.productId && it.qty > 0);

    if (rawItems.length === 0) {
      return res.status(400).json({
        message: "items duhet të kenë productId + qty > 0",
      });
    }

    const productIds = [...new Set(rawItems.map((x) => x.productId))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const products = await Product.find(
      { _id: { $in: productIds }, businessId: finalBusinessId },
      {
        _id: 1,
        categoryType: 1,
        subCategory: 1,
        price: 1,
        name: 1,
        nameSq: 1,
        nameEn: 1,
        nameIt: 1,
      }
    ).lean();

    const prodMap = new Map(products.map((p) => [String(p._id), p]));

    for (const it of rawItems) {
      if (!prodMap.has(it.productId)) {
        return res.status(400).json({
          message:
            "Një ose më shumë produkte janë jo valide ose nuk i përkasin këtij biznesi.",
          badProductId: it.productId,
        });
      }
    }

    const displayName = (p) =>
      String(p?.nameSq || p?.name || p?.nameEn || p?.nameIt || "").trim();

    const itemsWithDest = rawItems.map((it) => {
      const p = prodMap.get(it.productId);
      const ct = String(p?.categoryType || "").trim().toLowerCase();

      const destination = ct === "pije" ? "banak" : "kuzhine";

      const priceFinal = safeNum(p?.price, 0);

      return {
        productId: new mongoose.Types.ObjectId(it.productId),
        name: displayName(p),
        qty: it.qty,
        price: priceFinal,
        destination,
      };
    });

    const totalALL = round2(
      itemsWithDest.reduce((sum, it) => sum + it.price * it.qty, 0)
    );

    const totalConverted = convertFromALL(totalALL, currency, settings);

    const waiterNameSafe =
  `${finalWaiterName}`.trim() ||
  "Klient (QR)";

const createdBySafe = waiterNameSafe;
    const sourceNumberSafe = String(sourceNumber).trim();


// Numër fature atomik — pa race condition edhe kur dy porosi vijnë njëkohësisht.
const invoiceNumber = await getNextSequence(finalBusinessId, "invoice");


// Order.create() me invoiceNumber
const createdOrder = await Order.create({
  businessId: finalBusinessId,
  invoiceNumber,
  sourceType: st,
  sourceNumber: sourceNumberSafe,
  items: itemsWithDest,
  total: totalConverted,
  totalALL,
  currency,
  exchangeRateUsed: currency === "ALL" ? 1 : safeNum(settings[`${currency.toLowerCase()}Rate`], 1),
  createdBy: createdBySafe,
  waiterId: finalWaiterId,
  waiterName: finalWaiterName,
  acceptedByName: finalWaiterName,
  note: noteSafe,
  orderNote: noteSafe,
  status: "pending",
  destination: "banak",
});

    const populatedOrder = await Order.findById(createdOrder._id)
      .populate({
        path: "businessId",
        select: "name nipt address settings",
      })
      .lean();

    const normalizedOrder = {
      ...populatedOrder,
      business: populatedOrder.businessId || null,
    };

    const io = req.app.get("io");

    io?.to(`business:${finalBusinessId}`).emit("orders:created", {
      businessId: finalBusinessId,
      orderId: String(normalizedOrder._id),
      sourceType: normalizedOrder.sourceType,
      sourceNumber: normalizedOrder.sourceNumber,
      status: normalizedOrder.status,
      destination: normalizedOrder.destination,
      createdAt: normalizedOrder.createdAt,
      total: normalizedOrder.total,
      totalALL: normalizedOrder.totalALL,
      currency: normalizedOrder.currency || "ALL",

      waiterName: normalizedOrder.waiterName || "",
      createdBy: normalizedOrder.createdBy || "",
      acceptedByName: normalizedOrder.acceptedByName || "",
      waiterId: normalizedOrder.waiterId || "",

      items: normalizedOrder.items || [],
      business: normalizedOrder.business || null,

      note: normalizedOrder.note || "",
      orderNote: normalizedOrder.orderNote || "",
    });

    io?.to(`business:${finalBusinessId}`).emit("orders:changed", {
      businessId: finalBusinessId,
    });

    if (req.guestSession?._id) {
      try {
        req.guestSession.active = false;
        await req.guestSession.save();
      } catch (e) {
        console.error("❌ Error disabling guest session:", e);
      }
    }

    return res.status(201).json(normalizedOrder);
  } catch (err) {
    console.error("❌ Gabim te createOrder:", err);

    return res.status(500).json({
      message: "Gabim serveri",
      error: err.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "id nuk është ObjectId valid" });
    }

    const allowed = ["pending", "accepted", "done"];

    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: "status i pavlefshëm" });
    }

    const existing = await Order.findById(id).lean();

    if (!existing) {
      return res.status(404).json({ message: "Porosia nuk u gjet" });
    }

    const waiterBusinessId = String(req.waiter?.businessId || req.user?.businessId || "");
    const orderBusinessId = String(existing.businessId || "");

    if (waiterBusinessId !== orderBusinessId) {
      return res.status(403).json({ message: "Nuk ke akses për këtë porosi." });
    }

    const update = { status };

    if (status === "accepted") {
      update.acceptedBy = String(req.waiter?._id || req.user?.id || "");
      update.acceptedByName = String(req.waiter?.name || req.user?.name || "");
    }

    const order = await Order.findByIdAndUpdate(id, update, { new: true })
      .populate({
        path: "businessId",
        select: "name nipt address settings",
      })
      .lean();

    const io = req.app.get("io");
    const businessId = String(order.businessId?._id || order.businessId);

    io?.to(`business:${businessId}`).emit("orders:changed", {
  businessId,
});

io?.to(`business:${businessId}`).emit("order:updated", {
  businessId,
  orderId: String(order._id),
  sourceType: order.sourceType,
  sourceNumber: order.sourceNumber,
  status: order.status,
  acceptedBy: order.acceptedBy || "",
  acceptedByName: order.acceptedByName || "",
});

    if (status === "accepted") {
      io?.to(`business:${businessId}`).emit("manager:print-table-invoice", {
        ...order,
        businessId,
        business: order.businessId || null,
        printId: `accepted-${order._id}-${Date.now()}`,
        waiterName: order.acceptedByName || order.createdBy || "",
        acceptedBy: order.acceptedBy || "",
        acceptedByName: order.acceptedByName || order.createdBy || "",
      });
    }

    return res.json({
      ...order,
      business: order.businessId || null,
    });
  } catch (err) {
    console.error("❌ Gabim te updateOrderStatus:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

export const closeTableOrders = async (req, res) => {
  try {
    const businessId = String(req.waiter?.businessId || req.user?.businessId || "");
    const { sourceType, sourceNumber } = req.body;

    if (!businessId || !sourceType || !sourceNumber) {
      return res.status(400).json({
        message: "businessId, sourceType, sourceNumber janë të detyrueshme",
      });
    }

    const business = await Business.findById(businessId).lean();

    const orders = await Order.find({
      businessId,
      sourceType: String(sourceType).toLowerCase(),
      sourceNumber: String(sourceNumber).trim(),
      status: { $in: ["pending", "accepted"] },
    }).lean();

    if (!orders.length) {
      return res.status(404).json({
        message: "Nuk ka porosi të hapura për këtë burim",
      });
    }

    const itemsMap = {};

    orders.forEach((order) => {
      (order.items || []).forEach((it) => {
        const key = `${it.name}_${Number(it.price || 0)}`;

        if (!itemsMap[key]) {
          itemsMap[key] = {
            name: it.name,
            qty: 0,
            price: Number(it.price || 0),
          };
        }

        itemsMap[key].qty += Number(it.qty || 0);
      });
    });

    const mergedItems = Object.values(itemsMap);

    const totalALL = mergedItems.reduce(
      (sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0),
      0
    );

    await Order.updateMany(
      {
        businessId,
        sourceType: String(sourceType).toLowerCase(),
        sourceNumber: String(sourceNumber).trim(),
        status: { $in: ["pending", "accepted"] },
      },
      { $set: { status: "done" } }
    );

    const invoice = {
      invoiceType: "total",
      business,
      businessId,
      sourceType: String(sourceType).toLowerCase(),
      sourceNumber: String(sourceNumber).trim(),
      items: mergedItems,
      totalALL,
      waiterName:
        orders[0]?.acceptedByName ||
        orders[0]?.acceptedBy ||
        orders[0]?.createdBy ||
        "",
      createdAt: new Date(),
    };

    return res.json({
      message: "Fatura totale u krijua",
      invoice,
    });
  } catch (err) {
    console.error("❌ Gabim te closeTableOrders:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

const buildWaiterShiftReport = async ({ businessId, waiterId, waiterName }) => {

  const waiterMatch = [];

  if (waiterId) {
    waiterMatch.push({ waiterId: String(waiterId) });
    waiterMatch.push({ acceptedBy: String(waiterId) });
  }

  if (waiterName) {
    waiterMatch.push({ createdBy: String(waiterName) });
    waiterMatch.push({ acceptedBy: String(waiterName) });
    waiterMatch.push({ acceptedByName: String(waiterName) });
  }

const orders = await Order.find({
  businessId,
  shiftClosed: { $ne: true },

  status: { $ne: "cancelled" },

  ...(waiterMatch.length > 0 ? { $or: waiterMatch } : {}),
}).lean();

  const itemsMap = {};

  orders.forEach((order) => {
    (order.items || []).forEach((it) => {
      const key = `${it.name}_${Number(it.price || 0)}`;

      if (!itemsMap[key]) {
        itemsMap[key] = {
          name: it.name,
          qty: 0,
          price: Number(it.price || 0),
        };
      }

      itemsMap[key].qty += Number(it.qty || 0);
    });
  });

  const mergedItems = Object.values(itemsMap);

  const totalALL = mergedItems.reduce(
    (sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0),
    0
  );

  const business = await Business.findById(businessId).lean();

  return {
    orders,
    report: {
      reportType: "waiterShift",
      business,
      waiterId: waiterId || "",
      waiterName: waiterName || "",
      items: mergedItems,
      totalALL,
      orderCount: orders.length,
      createdAt: new Date(),
    },
  };
};
export const closeWaiterShift = async (req, res) => {
  try {
    const businessId = String(req.waiter?.businessId || req.user?.businessId || "");
    const waiterId = String(req.waiter?._id || req.user?.id || "");
    const waiterName = String(req.waiter?.name || req.user?.name || "");

    if (!businessId || (!waiterId && !waiterName)) {
      return res.status(400).json({
        message: "businessId dhe kamarieri janë të detyrueshme",
      });
    }

    const { orders, report } = await buildWaiterShiftReport({
      businessId,
      waiterId,
      waiterName,
    });

    if (!orders.length) {
      return res.status(404).json({
        message: "Nuk ka porosi për këtë kamarier sot",
      });
    }

    await Order.updateMany(
      { _id: { $in: orders.map((o) => o._id) } },
      {
        $set: {
          shiftClosed: true,
          shiftClosedAt: new Date(),
        },
      }
    );

    return res.json({
      message: "Xhiro e kamarierit u mbyll",
      report,
    });
  } catch (err) {
    console.error("❌ Gabim te closeWaiterShift:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};

export const getWaiterShiftPreview = async (req, res) => {
  try {
    const businessId = String(req.waiter?.businessId || req.user?.businessId || "");
    const waiterId = String(req.waiter?._id || req.user?.id || "");
    const waiterName = String(req.waiter?.name || req.user?.name || "");

    if (!businessId || (!waiterId && !waiterName)) {
      return res.status(400).json({
        message: "businessId dhe kamarieri janë të detyrueshme",
      });
    }

    const { orders, report } = await buildWaiterShiftReport({
      businessId,
      waiterId,
      waiterName,
    });

    if (!orders.length) {
      return res.status(404).json({
        message: "Nuk ka porosi për këtë kamarier sot",
      });
    }

    return res.json({
      message: "Preview i xhiros",
      report,
    });
  } catch (err) {
    console.error("❌ Gabim te getWaiterShiftPreview:", err);
    return res.status(500).json({ message: "Gabim serveri" });
  }
};