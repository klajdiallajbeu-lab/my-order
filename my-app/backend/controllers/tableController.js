import TableSession from "../models/TableSession.js";
import TableInvoice from "../models/TableInvoice.js";
import Order from "../models/Order.js";
import Place from "../models/Place.js";


// 1. GET OPEN TABLES
export const getOpenTables = async (req, res) => {
  try {
    const { businessId } = req.waiter;

    const tables = await TableSession.find({
      businessId,
      status: "open",
    }).sort({ createdAt: -1 });

    res.json(tables);
  } catch (err) {
    console.error("❌ getOpenTables error:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};


// 2. ADD ORDER TO TABLE
export const addOrderToTable = async (req, res) => {
  try {
    const { businessId, _id: waiterId } = req.waiter;
    const { tableNumber, items } = req.body;

    if (!tableNumber) {
      return res.status(400).json({ message: "Numri i tavolinës mungon" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Nuk ka produkte për porosinë" });
    }

    let table = await TableSession.findOne({
      businessId,
      tableNumber,
      status: "open",
    });

    const normalizedItems = items.map((item) => ({
      name: item.name || "",
      price: Number(item.price || 0),
      qty: Number(item.qty || 1),
    }));

    const totalAdd = normalizedItems.reduce(
      (sum, i) => sum + Number(i.price || 0) * Number(i.qty || 1),
      0
    );

    if (table) {
      table.items.push(...normalizedItems);
      table.total += totalAdd;
      await table.save();
    } else {
      table = await TableSession.create({
        businessId,
        tableNumber,
        items: normalizedItems,
        total: totalAdd,
        waiterId,
        status: "open",
      });
    }

    res.json(table);
  } catch (err) {
    console.error("❌ addOrderToTable error:", err);
    res.status(500).json({ message: "Gabim gjatë shtimit të porosisë" });
  }
};


// 3. CLOSE TABLE
export const closeTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId, _id: waiterId } = req.waiter;

    const tableNumber = String(id).trim();

    const orders = await Order.find({
      businessId,
      sourceType: "tavoline",
      sourceNumber: tableNumber,
      status: { $nin: ["closed", "done", "cancelled"] },
    });

    if (!orders.length) {
      return res.status(404).json({ message: "Tavolina nuk u gjet" });
    }

    const invoiceItems = [];

    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        invoiceItems.push({
          name: item.name,
          price: Number(item.price || 0),
          qty: Number(item.qty || 1),
          total: Number(item.price || 0) * Number(item.qty || 1),
        });
      });
    });

    const finalTotal = invoiceItems.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0
    );

    const invoice = {
      business: orders[0]?.business || null,
      waiterName: req.waiter?.name || "Kamarjer",
      sourceType: "tavoline",
      sourceNumber: tableNumber,
      items: invoiceItems,
      totalALL: finalTotal,
      currency: "ALL",
      createdAt: new Date(),
    };

    await Order.updateMany(
      {
        businessId,
        sourceType: "tavoline",
        sourceNumber: tableNumber,
        status: { $nin: ["closed", "done", "cancelled"] },
      },
      {
        $set: {
          status: "closed",
          closedAt: new Date(),
          closedByWaiterId: waiterId,
        },
      }
    );
const placeUpdate = await Place.updateOne(
  {
    businessId,
    type: "table",
    codeNormalized: tableNumber.toLowerCase(),
  },
  {
    $set: {
      isOccupied: false,
      occupiedByWaiterId: null,
      occupiedAt: null,
    },
  }
);

console.log("PLACE UPDATE CLOSE TABLE:", placeUpdate);

console.log("PLACE UPDATE CLOSE TABLE:", placeUpdate);

    res.json({
      message: "Tavolina u mbyll me sukses",
      tableNumber,
      closedOrders: orders.length,
      invoice,
    });
  } catch (err) {
    console.error("❌ closeTable error:", err);
    res.status(500).json({
      message: "Gabim serveri gjatë mbylljes së tavolinës",
    });
  }
};

// 4. GET TABLE INVOICE BY ID
export const getTableInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.waiter;

    const invoice = await TableInvoice.findOne({
      _id: id,
      businessId,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Fatura nuk u gjet" });
    }

    res.json(invoice);
  } catch (err) {
    console.error("❌ getTableInvoiceById error:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};


// 5. CLOSE SHIFT
export const closeShift = async (req, res) => {
  try {
    const { businessId, name } = req.waiter;

    const tables = await TableSession.find({
      businessId,
      status: "open",
    });

    const productMap = new Map();
    let grandTotal = 0;

    for (const table of tables) {
      for (const item of table.items || []) {
        const itemName = item.name || "Produkt";
        const price = Number(item.price || 0);
        const qty = Number(item.qty || 1);
        const itemTotal = price * qty;

        const key = itemName.trim().toLowerCase();

        if (!productMap.has(key)) {
          productMap.set(key, {
            name: itemName,
            qty: 0,
            total: 0,
          });
        }

        const existing = productMap.get(key);
        existing.qty += qty;
        existing.total += itemTotal;

        grandTotal += itemTotal;
      }

      table.status = "done";
      await table.save();
    }

    const products = Array.from(productMap.values());

    res.json({
      message: "Xhiro u mbyll",
      waiterName: name || "Kamarjer",
      closedAt: new Date(),
      products,
      total: grandTotal,
      tables: tables.length,
    });
  } catch (err) {
    console.error("❌ closeShift error:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};