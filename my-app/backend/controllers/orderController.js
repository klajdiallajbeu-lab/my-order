import mongoose from "mongoose";
import Order from "../models/Order.js";
import Business from "../models/Business.js";
import Product from "../models/Product.js";
import SubCategory from "../models/SubCategory.js";
import GuestSession from "../models/GuestSession.js";

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
    const { businessId, from, to, sourceType } = req.query;

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
    return res.status(500).json({
      message: "Gabim serveri",
      error: err.message,
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "id nuk është ObjectId valid" });
    }

    const order = await Order.findById(id)
      .populate("businessId")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Fatura nuk u gjet" });
    }

    return res.json({
      ...order,
      business: order.businessId || null,
    });
  } catch (err) {
    console.error("❌ Gabim te getOrderById:", err);
    return res.status(500).json({
      message: "Gabim serveri",
      error: err.message,
    });
  }
};

export const createOrder = async (req, res) => {
  try {
    console.log("📥 BODY /api/orders:", req.body);
    const {
  businessId,
  sourceType,
  sourceNumber,
  items,
  createdBy,
  waiterId,
  note,
  orderNote,
} = req.body;

const noteSafe = String(note || orderNote || "").trim();
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
    if (!business) {
      return res.status(404).json({ message: "Biznesi nuk ekziston më." });
    }

    const now = new Date();
    if (business.endDate && new Date(business.endDate) < now) {
      return res.status(403).json({ message: "Ky biznes ka skaduar dhe nuk pranon më porosi." });
    }

    const settings = business?.settings || {};
    const currency = ALLOWED_CURRENCIES.includes(settings.baseCurrency)
      ? settings.baseCurrency
      : "ALL";

    const access = business?.settings?.orderAccess;
    const isHHMM = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

    const inWindow = (start, end) => {
      const toMin = (hhmm) => {
        const [h, m] = String(hhmm || "0:0").split(":").map(Number);
        return h * 60 + (m || 0);
      };

      const now2 = new Date();
      const nowMin = now2.getHours() * 60 + now2.getMinutes();
      const s = toMin(start);
      const e = toMin(end);

      if (s > e) return nowMin >= s || nowMin < e;
      return nowMin >= s && nowMin < e;
    };

    if (access?.enabled === true && (st === "dhoma" || st === "cadra")) {
      const apply = Array.isArray(access.applyTo) ? access.applyTo : ["room", "umbrella"];
      const shouldApply =
        (st === "dhoma" && apply.includes("room")) ||
        (st === "cadra" && apply.includes("umbrella"));

      if (shouldApply) {
        const start = isHHMM(access.windowStart) ? access.windowStart : "23:00";
        const end = isHHMM(access.windowEnd) ? access.windowEnd : "07:00";

        if (inWindow(start, end)) {
          return res.status(403).json({
            message: `Porositë janë të mbyllura nga ${start} deri në ${end}.`,
          });
        }
      }
    }

    const rawItems = items
      .map((it) => ({
        productId: isValidObjectId(it.productId) ? String(it.productId) : "",
        qty: safeNum(it.qty ?? it.quantity, 0),
        price: it.price === undefined ? undefined : safeNum(it.price, 0),
      }))
      .filter((it) => it.productId && it.qty > 0);

    if (rawItems.length === 0) {
      return res.status(400).json({ message: "items duhet të kenë productId + qty > 0" });
    }

    const productIds = [...new Set(rawItems.map((x) => x.productId))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const products = await Product.find(
      { _id: { $in: productIds }, businessId },
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
          message: "Një ose më shumë produkte janë jo valide ose nuk i përkasin këtij biznesi.",
          badProductId: it.productId,
        });
      }
    }

    const displayName = (p) =>
      String(p?.nameSq || p?.name || p?.nameEn || p?.nameIt || "").trim();

    const defaultDestByCategoryType = (ct) => {
      const t = String(ct || "").toLowerCase().trim();
      if (t === "pije") return "banak";
      return "kuzhine";
    };

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
        .select("businessId categoryType name nameSq destination")
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

    const itemsWithDest = rawItems.map((it) => {
      const p = prodMap.get(it.productId);
      const ct = String(p?.categoryType || "").trim().toLowerCase();
      const sc = String(p?.subCategory || "").trim();
      const fromSub = subMap.get(`${ct}||${sc}`);
      const destination =
  ct === "pije"
    ? "banak"
    : "kuzhine";

      const priceFinal =
        it.price === undefined ? safeNum(p?.price, 0) : safeNum(it.price, safeNum(p?.price, 0));

      return {
        productId: new mongoose.Types.ObjectId(it.productId),
        name: displayName(p),
        qty: it.qty,
        price: priceFinal,
        destination,
      };
    });

    const kuzhineItems = itemsWithDest.filter((x) => x.destination === "kuzhine");
    const banakItems = itemsWithDest.filter((x) => x.destination === "banak");

    const calcTotals = (arr) => {
      const totalALL = round2(arr.reduce((sum, it) => sum + it.price * it.qty, 0));
      const totalConverted = convertFromALL(totalALL, currency, settings);
      return { totalALL, totalConverted };
    };

    const batchId =
      kuzhineItems.length && banakItems.length ? new mongoose.Types.ObjectId().toString() : "";

    const createdBySafe = createdBy || "Klient (QR)";
    const sourceNumberSafe = String(sourceNumber).trim();

    const createdOrders = [];

    if (kuzhineItems.length) {
      const { totalALL, totalConverted } = calcTotals(kuzhineItems);

      createdOrders.push(
        await Order.create({
          businessId,
          sourceType: st,
          sourceNumber: sourceNumberSafe,
          items: kuzhineItems.map(({ destination, ...rest }) => rest),
          total: totalConverted,
          totalALL,
          currency,
          exchangeRateUsed:
            currency === "ALL"
              ? 1
              : safeNum(settings[`${currency.toLowerCase()}Rate`], 1),
              createdBy: createdBySafe,
waiterId: waiterId || "",
note: noteSafe,
orderNote: noteSafe,
status: "pending",
        })
      );
    }

    if (banakItems.length) {
      const { totalALL, totalConverted } = calcTotals(banakItems);

      createdOrders.push(
        await Order.create({
          businessId,
          sourceType: st,
          sourceNumber: sourceNumberSafe,
          items: banakItems.map(({ destination, ...rest }) => rest),
          total: totalConverted,
          totalALL,
          currency,
          exchangeRateUsed:
            currency === "ALL"
              ? 1
              : safeNum(settings[`${currency.toLowerCase()}Rate`], 1),
              createdBy: createdBySafe,
waiterId: waiterId || "",
status: "pending",
destination: "banak",
batchId,
        })
      );
    }

if (createdOrders.length === 0) {
  return res.status(400).json({
    message: "Nuk u krijua asnjë porosi (items bosh).",
  });
}

const createdIds = createdOrders.map((o) => o._id);

const populatedOrders = await Order.find({ _id: { $in: createdIds } })
  .populate({
    path: "businessId",
    select: "name nipt address settings",
  })
  .sort({ createdAt: 1 })
  .lean();

const normalizedOrders = populatedOrders.map((order) => ({
  ...order,
  business: order.businessId || null,
}));


// 📡 SOCKET EVENTS
// 📡 SOCKET EVENTS
const io = req.app.get("io");

for (const o of normalizedOrders) {
  io?.to(`business:${businessId}`).emit("orders:created", {
    businessId,
    orderId: String(o._id),
    sourceType: o.sourceType,
    sourceNumber: o.sourceNumber,
    status: o.status,
    destination: o.destination,
    batchId: o.batchId || "",
    createdAt: o.createdAt,
    total: o.total,
    totalALL: o.totalALL,
    currency: o.currency || "ALL",
  });
}

io?.to(`business:${businessId}`).emit("orders:changed", {
  businessId,
});

io?.to(`business:${businessId}`).emit("orders:changed", { businessId });

// 🔒 1 SCAN = 1 POROSI (disable session)
if (req.guestSession?._id) {
  try {
    req.guestSession.active = false;
    await req.guestSession.save();
  } catch (e) {
    console.error("❌ Error disabling guest session:", e);
  }
}

// ✅ RESPONSE
return res.status(201).json(
  normalizedOrders.length === 1
    ? normalizedOrders[0]
    : normalizedOrders
);
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
    const { status, acceptedBy, acceptedByName } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "id nuk është ObjectId valid" });
    }

    const allowed = ["pending", "accepted", "done"];

    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: "status i pavlefshëm" });
    }

    const update = { status };

    if (status === "accepted") {
      update.acceptedBy = acceptedBy || "";
      update.acceptedByName = acceptedByName || "";
    }

    const order = await Order.findByIdAndUpdate(id, update, { new: true })
      .populate({
        path: "businessId",
        select: "name nipt address settings",
      })
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Porosia nuk u gjet" });
    }

    const io = req.app.get("io");
    const businessId = String(order.businessId?._id || order.businessId);

    io?.to(`business:${businessId}`).emit("orders:changed", { businessId });

    io?.to(`business:${businessId}`).emit("order:updated", {
      businessId,
      orderId: String(order._id),
      sourceType: order.sourceType,
      sourceNumber: order.sourceNumber,
      status: order.status,
      acceptedBy: order.acceptedBy || "",
      acceptedByName: order.acceptedByName || "",
    });

    return res.json({
      ...order,
      business: order.businessId || null,
    });
  } catch (err) {
    console.error("❌ Gabim te updateOrderStatus:", err);
    return res.status(500).json({
      message: "Gabim serveri",
      error: err.message,
    });
  }
};

export const closeTableOrders = async (req, res) => {
  try {
    const { businessId, sourceType, sourceNumber } = req.body;

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
      {
        $set: {
          status: "done",
        },
      }
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
    return res.status(500).json({
      message: "Gabim serveri",
      error: err.message,
    });
  }
};

const buildWaiterShiftReport = async ({ businessId, waiterId, waiterName }) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

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
    createdAt: { $gte: start, $lte: end },
    shiftClosed: { $ne: true },

    // merr çdo porosi të ditës përveç anulimeve
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
    const { businessId, waiterId, waiterName } = req.body;

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
      {
        _id: { $in: orders.map((o) => o._id) },
      },
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
    return res.status(500).json({
      message: "Gabim serveri",
      error: err.message,
    });
  }
};

export const getWaiterShiftPreview = async (req, res) => {
  try {
    const { businessId, waiterId, waiterName } = req.body;

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
    return res.status(500).json({
      message: "Gabim serveri",
      error: err.message,
    });
  }
};