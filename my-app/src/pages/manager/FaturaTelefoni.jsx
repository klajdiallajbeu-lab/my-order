import { useEffect, useRef, useState } from "react";
import { socket } from "../../realtime/socket.js";
import { api } from "../../api/http.js";

export default function FaturaTelefoni() {
  const [status, setStatus] = useState("Gati për printim");

  const printingRef = useRef(false);
  const printedKeysRef = useRef(new Set());

  const ratesRef = useRef({
    eurRate: 0,
    usdRate: 0,
    gbpRate: 0,
    chfRate: 0,
  });

  const businessId =
    localStorage.getItem("businessId") ||
    sessionStorage.getItem("businessId") ||
    "";

  const formatLine = (left, right, width = 30) => {
    let l = String(left || "").trim();
    const r = String(right || "").trim();
    const maxLeft = width - r.length - 1;

    if (maxLeft <= 0) return `${l}\n${r}\n`;
    if (l.length > maxLeft) l = l.slice(0, maxLeft);

    return `${l}${" ".repeat(width - l.length - r.length)}${r}\n`;
  };

  const convertFromALL = (amount, rate, code) => {
    const r = Number(rate);
    if (!r || r <= 0) return "-";
    return `${(Number(amount) / r).toFixed(2)} ${code}`;
  };

  const buildCurrencyConversions = (total, settings = {}) => {
    const totalNumber = Number(total || 0);

    const finalRates = {
      ...ratesRef.current,
      ...(settings || {}),
    };

    return [
      formatLine(
        "EUR:",
        convertFromALL(totalNumber, finalRates.eurRate, "EUR")
      ),
      formatLine(
        "USD:",
        convertFromALL(totalNumber, finalRates.usdRate, "USD")
      ),
      formatLine(
        "GBP:",
        convertFromALL(totalNumber, finalRates.gbpRate, "GBP")
      ),
      formatLine(
        "CHF:",
        convertFromALL(totalNumber, finalRates.chfRate, "CHF")
      ),
    ];
  };

  const getPrinterConfig = async () => {
    if (!window.qz) {
      setStatus("QZ Tray nuk u gjet në këtë PC.");
      return null;
    }

    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }

    const printers = await window.qz.printers.find();

    const printerName =
      localStorage.getItem("invoicePrinter") ||
      localStorage.getItem("printerName") ||
      printers.find((p) => p.toLowerCase().includes("rongta")) ||
      printers.find((p) => p.toLowerCase().includes("rpp02")) ||
      printers[0];

    if (!printerName) {
      setStatus("Nuk u gjet printer.");
      return null;
    }

    return window.qz.configs.create(printerName);
  };

  const buildItemsLines = (items = []) => {
    return items.map((item) => {
      const qty = Number(item?.qty || 0);
      const price = Number(item?.price || 0);

      return formatLine(
        `${qty}x ${item?.name || "Artikull"}`,
        `${(qty * price).toFixed(0)} ALL`
      );
    });
  };

  const printTableInvoice = async (invoice) => {
    const config = await getPrinterConfig();
    if (!config) return false;

    const businessName =
      invoice?.business?.name ||
      localStorage.getItem("hotelName") ||
      "Biznesi";

    const tableNumber = invoice?.sourceNumber || invoice?.tableNumber || "-";

    const waiterName =
      invoice?.waiterName ||
      invoice?.createdBy ||
      localStorage.getItem("waiterName") ||
      "-";

    const totalNumber = Number(invoice?.totalALL || invoice?.total || 0);

    const currencyLines = buildCurrencyConversions(
      totalNumber,
      invoice?.business?.settings
    );

    const line = "------------------------------\n";

    const data = [
      "\x1B\x40",
      "\x1B\x4D\x00",
      "\x1D\x21\x00",

      "\x1B\x61\x01",
      `${businessName}\n`,
      "\n*** FATURË TOTALE ***\n\n",

      "\x1B\x61\x00",
      line,
      `Tavolina: ${tableNumber}\n`,
      `Kamarier: ${waiterName}\n`,
      `Data: ${new Date().toLocaleString("sq-AL", { hour12: false })}\n`,
      line,

      ...buildItemsLines(invoice?.items || []),

      line,
      formatLine("TOTAL:", `${totalNumber.toFixed(0)} ALL`),
      ...currencyLines,

      "\x1B\x61\x01",
      "\nJu Faleminderit!\n",
      "www.myOrder.al\n",
      "\n\n\n",
    ];

    await window.qz.print(config, data);
    setStatus(`U printua fatura e tavolinës ${tableNumber}`);
    return true;
  };
  const printKitchenOnly = async (order, kitchenItems) => {
  if (!Array.isArray(kitchenItems) || kitchenItems.length === 0) return true;

  const config = await getPrinterConfig();
  if (!config) return false;

  const businessName =
    order?.business?.name ||
    localStorage.getItem("hotelName") ||
    "Biznesi";

  const sourceType = String(order?.sourceType || "").toLowerCase();

  const sourceLabel =
    sourceType === "dhoma"
      ? "Dhoma"
      : sourceType === "cadra"
      ? "Çadra"
      : "Tavolina";

  const sourceNumber = order?.sourceNumber || "-";

  const waiterName =
    order?.acceptedBy ||
    order?.createdBy ||
    localStorage.getItem("waiterName") ||
    "-";

  const noteText = String(order?.note || order?.orderNote || "").trim();

  const line = "------------------------------\n";

  const data = [
    "\x1B\x40",
    "\x1B\x4D\x00",
    "\x1D\x21\x00",

    "\x1B\x61\x01",
    `${businessName}\n`,
    "\n*** POROSI KUZHINE ***\n\n",

    "\x1B\x61\x00",
    line,
    `${sourceLabel}: ${sourceNumber}\n`,
    `Kamarier: ${waiterName}\n`,
    `Data: ${new Date(order?.createdAt || Date.now()).toLocaleString("sq-AL", {
      hour12: false,
    })}\n`,

    ...(noteText
      ? [
          line,
          "SHENIM:\n",
          `${noteText}\n`,
        ]
      : []),

    line,

    ...buildItemsLines(kitchenItems),

    "\x1B\x61\x01",
    "\n\n\n",
  ];

  await window.qz.print(config, data);
  return true;
};

const printOrder = async (ordersGroup) => {
  const config = await getPrinterConfig();
  if (!config) return false;

  const orders = Array.isArray(ordersGroup) ? ordersGroup : [ordersGroup];

  const mainOrder = orders[0];
  const kitchenOrder = orders.find(
    (o) => String(o?.destination || "").toLowerCase() === "kuzhine"
  );

  const allItemsForBar = orders.flatMap((o) => o?.items || []);
  const kitchenItems = kitchenOrder?.items || [];

  const businessName =
    mainOrder?.business?.name ||
    localStorage.getItem("hotelName") ||
    "Biznesi";

  const sourceType = String(mainOrder?.sourceType || "").toLowerCase();
  const sourceLabel =
    sourceType === "dhoma" ? "Dhoma" : sourceType === "cadra" ? "Çadra" : "Tavolina";

  const sourceNumber = mainOrder?.sourceNumber || "-";
  const waiterName =
    mainOrder?.acceptedBy ||
    mainOrder?.createdBy ||
    localStorage.getItem("waiterName") ||
    "-";

  const noteText = String(mainOrder?.note || mainOrder?.orderNote || "").trim();

  const totalNumber = allItemsForBar.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
    0
  );

  const currencyLines = buildCurrencyConversions(
    totalNumber,
    mainOrder?.business?.settings
  );

  const line = "------------------------------\n";

  const barData = [
    "\x1B\x40",
    "\x1B\x4D\x00",
    "\x1D\x21\x00",
    "\x1B\x61\x01",
    `${businessName}\n`,
    "\n*** POROSI BAR ***\n\n",
    "\x1B\x61\x00",
    line,
    `${sourceLabel}: ${sourceNumber}\n`,
    `Kamarier: ${waiterName}\n`,
    `Data: ${new Date(mainOrder?.createdAt || Date.now()).toLocaleString("sq-AL", {
      hour12: false,
    })}\n`,
    ...(noteText ? [line, "SHENIM:\n", `${noteText}\n`] : []),
    line,
    ...buildItemsLines(allItemsForBar),
    line,
    formatLine("TOTAL:", `${totalNumber.toFixed(0)} ALL`),
    ...currencyLines,
    "\x1B\x61\x01",
    "\nJu Faleminderit!\n",
    "www.myOrder.al\n",
    "\n\n\n",
  ];

  await window.qz.print(config, barData);

  if (kitchenItems.length > 0) {
    await printKitchenOnly(kitchenOrder, kitchenItems);
  }

  setStatus(`U printua porosia ${sourceLabel} ${sourceNumber}`);
  return true;
};

  const printShiftReport = async (report) => {
    const config = await getPrinterConfig();
    if (!config) return false;

    const businessName =
      report?.business?.name ||
      localStorage.getItem("hotelName") ||
      "Biznesi";

    const waiterName =
      report?.waiterName || localStorage.getItem("waiterName") || "-";

    const totalNumber = Number(report?.totalALL || report?.total || 0);

    const currencyLines = buildCurrencyConversions(
      totalNumber,
      report?.business?.settings
    );

    const line = "------------------------------\n";

    const data = [
      "\x1B\x40",
      "\x1B\x4D\x00",
      "\x1D\x21\x00",

      "\x1B\x61\x01",
      `${businessName}\n`,
      "\n*** XHIRO DITORE ***\n\n",

      "\x1B\x61\x00",
      line,
      `Kamarier: ${waiterName}\n`,
      `Porosi: ${report?.orderCount || 0}\n`,
      `Data: ${new Date().toLocaleString("sq-AL", { hour12: false })}\n`,
      line,

      ...buildItemsLines(report?.items || []),

      line,
      formatLine("TOTAL:", `${totalNumber.toFixed(0)} ALL`),
      ...currencyLines,

      "\x1B\x61\x01",
      "\nJu Faleminderit!\n",
      "www.myOrder.al\n",
      "\n\n\n",
    ];

    await window.qz.print(config, data);
    setStatus("U printua xhiro ditore.");
    return true;
  };

  const runPrintOnce = async (key, callback) => {
    if (!key) return;
    if (printedKeysRef.current.has(key)) return;
    if (printingRef.current) return;

    try {
      printedKeysRef.current.add(key);
      printingRef.current = true;

      const ok = await callback();

      if (!ok) {
        printedKeysRef.current.delete(key);
      }
    } catch (err) {
      console.error("Gabim printimi:", err);
      printedKeysRef.current.delete(key);
      setStatus("Gabim gjatë printimit.");
    } finally {
      setTimeout(() => {
        printingRef.current = false;
      }, 3000);
    }
  };

  useEffect(() => {
    if (!businessId) {
      setStatus("Mungon businessId.");
      return;
    }

    api
      .get(`/business/${businessId}/settings`)
      .then((res) => {
        const settings = res?.data?.settings || {};

        ratesRef.current = {
          eurRate: Number(settings.eurRate || 0),
          usdRate: Number(settings.usdRate || 0),
          gbpRate: Number(settings.gbpRate || 0),
          chfRate: Number(settings.chfRate || 0),
        };

        console.log("💱 RATE NGA BACKEND:", ratesRef.current);
      })
      .catch((err) => {
        console.error("Gabim duke marrë rate:", err?.response?.data || err);
      });

    const join = () => {
      socket.emit("joinBusiness", businessId);
      setStatus("Duke pritur printime...");
    };

    if (socket.connected) join();

    socket.off("connect", join);
    socket.on("connect", join);

    const handleTableInvoice = async (payload) => {
      console.log("🔥 ERDHI table:invoice:", payload);

      if (!payload) return;
      if (String(payload.businessId) !== String(businessId)) return;

      const key = `table:${
        payload.invoiceId ||
        payload._id ||
        payload.batchId ||
        `${payload.tableNumber || payload.sourceNumber || "-"}-${
          payload.createdAt || Date.now()
        }`
      }`;

      await runPrintOnce(key, async () => {
        setStatus("Duke printuar faturën totale...");
        return await printTableInvoice(payload);
      });
    };

    const handleOrderCreated = async (payload) => {
      console.log("📦 ERDHI orders:created:", payload);

      if (!payload) return;
      if (String(payload.businessId) !== String(businessId)) return;

      const orderId = payload.orderId || payload._id;
      if (!orderId) return;

      const key = `order:${orderId}`;

      await runPrintOnce(key, async () => {
        setStatus("Duke printuar porosinë...");

        const res = await api.get("/orders", {
          params: { businessId },
        });

        const orders = Array.isArray(res?.data) ? res.data : [];
        const order = orders.find((o) => String(o?._id) === String(orderId));

        if (!order) {
          setStatus("Porosia nuk u gjet për printim.");
          return false;
        }

        const relatedOrders = order.batchId
  ? orders.filter((o) => String(o.batchId || "") === String(order.batchId))
  : [order];

return await printOrder(relatedOrders);
      });
    };

    const handleShiftReport = async (payload) => {
      console.log("💰 ERDHI waiter:shift-report:", payload);

      if (!payload) return;
      if (String(payload.businessId) !== String(businessId)) return;

      const key = `shift:${payload.waiterName || "-"}-${
        payload.createdAt || Date.now()
      }`;

      await runPrintOnce(key, async () => {
        setStatus("Duke printuar xhiron...");
        return await printShiftReport(payload);
      });
    };

    socket.off("table:invoice", handleTableInvoice);
    socket.off("orders:created", handleOrderCreated);
    socket.off("waiter:shift-report", handleShiftReport);

    socket.on("table:invoice", handleTableInvoice);
    socket.on("orders:created", handleOrderCreated);
    socket.on("waiter:shift-report", handleShiftReport);

    return () => {
      socket.off("connect", join);
      socket.off("table:invoice", handleTableInvoice);
      socket.off("orders:created", handleOrderCreated);
      socket.off("waiter:shift-report", handleShiftReport);
    };
  }, [businessId]);

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        background: "#0f172a",
        color: "white",
        padding: "10px 14px",
        borderRadius: 12,
        fontSize: 13,
      }}
    >
      Printer telefoni: {status}
    </div>
  );
}