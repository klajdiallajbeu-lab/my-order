import { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../../realtime/socket.js";
import { api } from "../../api/http.js";
import "../../qz-signing";

export default function FaturaTelefoni() {
  const [status, setStatus] = useState("Gati për printim");
  const [timeNow, setTimeNow] = useState(new Date());
  const [lastOrders, setLastOrders] = useState([]);
  const [activePrinter, setActivePrinter] = useState(
    localStorage.getItem("invoicePrinter") ||
      localStorage.getItem("printerName") ||
      "Duke kontrolluar..."
  );

  const printingRef = useRef(false);
  const printedKeysRef = useRef(new Set());

  const ratesRef = useRef({
    eurRate: 0,
    usdRate: 0,
    gbpRate: 0,
    chfRate: 0,
  });

  const businessId = useMemo(() => {
    return (
      localStorage.getItem("businessId") ||
      sessionStorage.getItem("businessId") ||
      ""
    );
  }, []);

  const businessName = localStorage.getItem("hotelName") || "Biznesi";

  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getQz = () => window.qz;

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
    const finalRates = { ...ratesRef.current, ...(settings || {}) };

    return [
      formatLine("EUR:", convertFromALL(totalNumber, finalRates.eurRate, "EUR")),
      formatLine("USD:", convertFromALL(totalNumber, finalRates.usdRate, "USD")),
      formatLine("GBP:", convertFromALL(totalNumber, finalRates.gbpRate, "GBP")),
      formatLine("CHF:", convertFromALL(totalNumber, finalRates.chfRate, "CHF")),
    ];
  };

  const getPrinterConfig = async () => {
    const qz = getQz();

    if (!qz) {
      setStatus("QZ Tray nuk u gjet në këtë PC.");
      return null;
    }

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    const printers = await qz.printers.find();

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

    setActivePrinter(printerName);
    return qz.configs.create(printerName);
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

  const getSourceLabel = (sourceType) => {
    const type = String(sourceType || "").toLowerCase();

    if (type === "dhoma") return "Dhoma";
    if (type === "cadra") return "Çadra";
    return "Tavolina";
  };

  const printKitchenOnly = async (order, kitchenItems) => {
    if (!Array.isArray(kitchenItems) || kitchenItems.length === 0) return true;

    const qz = getQz();
    const config = await getPrinterConfig();
    if (!qz || !config) return false;

    const sourceLabel = getSourceLabel(order?.sourceType);
    const sourceNumber = order?.sourceNumber || "-";

const waiterName =
  order?.acceptedByName ||
  order?.waiterName ||
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

      ...(noteText ? [line, "SHENIM:\n", `${noteText}\n`] : []),

      line,
      ...buildItemsLines(kitchenItems),

      "\x1B\x61\x01",
      "\n\n\n",
    ];

    await qz.print(config, data);
    return true;
  };

  const printOrder = async (ordersGroup) => {
    const qz = getQz();
    const config = await getPrinterConfig();
    if (!qz || !config) return false;

    const orders = Array.isArray(ordersGroup) ? ordersGroup : [ordersGroup];
    const mainOrder = orders[0];

    if (!mainOrder) return false;

const allItemsForBar = orders.flatMap((o) => o?.items || []);


const kitchenItems = allItemsForBar.filter(
  (item) =>
    String(item?.destination || "").toLowerCase() === "kuzhine"
);

const kitchenOrder =
  orders.find((o) => String(o?.destination || "").toLowerCase() === "kuzhine") ||
  mainOrder;

    const sourceLabel = getSourceLabel(mainOrder?.sourceType);
    const sourceNumber = mainOrder?.sourceNumber || "-";

const waiterName =
  mainOrder?.acceptedByName ||
  mainOrder?.waiterName ||
  mainOrder?.createdBy ||
  localStorage.getItem("waiterName") ||
  "-";


    const noteText = String(mainOrder?.note || mainOrder?.orderNote || "").trim();

    const totalNumber = allItemsForBar.reduce(
      (sum, item) => sum + Number(item?.qty || 0) * Number(item?.price || 0),
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
      `Data: ${new Date(mainOrder?.createdAt || Date.now()).toLocaleString(
        "sq-AL",
        { hour12: false }
      )}\n`,

      ...(noteText ? [line, "SHENIM:\n", `${noteText}\n`] : []),

      line,
      ...buildItemsLines(allItemsForBar),
      line,
      formatLine("TOTAL:", `${totalNumber.toFixed(0)} ALL`),
      ...currencyLines,

      "\x1B\x61\x01",
      "\nJu Faleminderit!\n",
      "www.myorderal.com\n",
      "\n\n\n",
    ];

    await qz.print(config, barData);

    if (kitchenItems.length > 0) {
      await printKitchenOnly(kitchenOrder, kitchenItems);
    }

    setLastOrders((prev) => [
      {
        id: mainOrder?._id || Date.now(),
        sourceLabel,
        sourceNumber,
        total: totalNumber,
        time: new Date().toLocaleTimeString("sq-AL", { hour12: false }),
      },
      ...prev.slice(0, 8),
    ]);

    setStatus(`U printua porosia ${sourceLabel} ${sourceNumber}`);
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

      if (!ok) printedKeysRef.current.delete(key);
    } catch (err) {
      console.error("Gabim printimi:", err);
      printedKeysRef.current.delete(key);
      setStatus("Gabim gjatë printimit.");
    } finally {
      setTimeout(() => {
        printingRef.current = false;
      }, 2500);
    }
  };

  const normalizePayloadToOrder = async (payload) => {
    const directOrder = payload?.order || payload?.invoice || payload;

    const orderId =
      payload?.orderId ||
      payload?._id ||
      payload?.id ||
      payload?.order?._id ||
      payload?.invoice?._id;

      if (directOrder?.items?.length) {
  const batchId = directOrder?.batchId;

  if (batchId) {
    const res = await api.get("/orders", {
      params: { businessId },
    });

    const orders = Array.isArray(res?.data) ? res.data : [];

    const relatedOrders = orders.filter(
      (o) => String(o.batchId || "") === String(batchId)
    );

    if (relatedOrders.length > 0) {
      return relatedOrders;
    }
  }

  return directOrder;
}

    if (!orderId) return null;

    const res = await api.get("/orders", {
      params: { businessId },
    });

    const orders = Array.isArray(res?.data) ? res.data : [];
    const order = orders.find((o) => String(o?._id) === String(orderId));

    if (!order) return null;

    if (order.batchId) {
      return orders.filter((o) => String(o.batchId || "") === String(order.batchId));
    }

    return order;
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
      })
      .catch((err) => {
        console.error("Gabim duke marrë rate:", err?.response?.data || err);
      });

    socket.connect();

    const join = () => {
      socket.emit("joinBusiness", businessId);
      setStatus("Duke pritur porosi nga telefoni...");
      console.log("✅ FaturaTelefoni joined:", businessId);
    };

    const onReconnect = () => {
  console.log("✅ Socket reconnected");

  socket.emit("joinBusiness", businessId);

  setStatus("Duke pritur porosi nga telefoni...");
};

    const handlePrintEvent = async (payload) => {
      console.log("📥 ERDHI EVENT PRINT:", payload);

      if (!payload) return;

      const payloadBusinessId =
        payload?.businessId ||
        payload?.order?.businessId ||
        payload?.invoice?.businessId ||
        payload?.business?._id;

      if (payloadBusinessId && String(payloadBusinessId) !== String(businessId)) {
        return;
      }

      const rawKey =
        payload?.printId ||
        payload?.invoiceId ||
        payload?.orderId ||
        payload?._id ||
        payload?.order?._id ||
        payload?.invoice?._id ||
        `${payload?.sourceType || "src"}:${payload?.sourceNumber || "nr"}:${Date.now()}`;

      const key = `phone-print:${rawKey}`;

      await runPrintOnce(key, async () => {
        setStatus("Duke kontrolluar porosinë...");

        const orderOrGroup = await normalizePayloadToOrder(payload);

        if (!orderOrGroup) {
          setStatus("Porosia nuk u gjet për printim.");
          return false;
        }

        const firstOrder = Array.isArray(orderOrGroup) ? orderOrGroup[0] : orderOrGroup;

        const createdFrom = String(firstOrder?.createdFrom || "").toLowerCase();

if (createdFrom === "waiter-desktop") {
  return false;
}

        const sourceType = String(firstOrder?.sourceType || "").toLowerCase();

        const shouldPrint =
          sourceType === "dhoma" ||
          sourceType === "cadra" ||
          sourceType === "tavoline" ||
          createdFrom.includes("mobile") ||
          createdFrom.includes("phone");

        if (!shouldPrint) {
          setStatus("Duke pritur porosi nga telefoni...");
          return false;
        }

        setStatus("Duke printuar porosinë...");
        const fixWaiterName = (o) => ({
  ...o,
  acceptedByName:
    o?.acceptedByName ||
    payload?.acceptedByName ||
    payload?.waiterName ||
    "",
  waiterName:
    o?.waiterName ||
    payload?.waiterName ||
    payload?.acceptedByName ||
    "",
});

const fixedOrderOrGroup = Array.isArray(orderOrGroup)
  ? orderOrGroup.map(fixWaiterName)
  : fixWaiterName(orderOrGroup);


        return await printOrder(fixedOrderOrGroup);
      });
    };

    socket.off("connect", join);
    socket.on("connect", join);

    socket.io.off("reconnect", onReconnect);
    socket.io.on("reconnect", onReconnect);

    if (socket.connected) join();



    socket.off("orders:created", handlePrintEvent);
    socket.off("order:created", handlePrintEvent);
    socket.off("orders:changed", handlePrintEvent);
    socket.off("order:updated", handlePrintEvent);
    socket.off("manager:print-table-invoice", handlePrintEvent);
    socket.off("table:invoice", handlePrintEvent);

    socket.on("orders:created", handlePrintEvent);
    socket.on("order:created", handlePrintEvent);
    socket.on("manager:print-table-invoice", handlePrintEvent);
    socket.on("table:invoice", handlePrintEvent);

return () => {
  socket.off("connect", join);
  socket.io.off("reconnect", onReconnect);

  socket.off("orders:created", handlePrintEvent);
  socket.off("order:created", handlePrintEvent);
  socket.off("manager:print-table-invoice", handlePrintEvent);
  socket.off("table:invoice", handlePrintEvent);
};
  }, [businessId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f8fd",
        padding: 32,
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1450,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 32,
          padding: 38,
          boxShadow: "0 20px 60px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div
              style={{
                width: 82,
                height: 82,
                borderRadius: 26,
                background: "#edf4ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 38,
              }}
            >
              🖨️
            </div>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 54,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                Print Listener
              </h1>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: 22,
                  fontWeight: 500,
                }}
              >
                Printim automatik për porositë nga telefoni
              </p>
            </div>
          </div>

          <div
            style={{
              background: "#eaf8ef",
              color: "#16a34a",
              padding: "16px 26px",
              borderRadius: 20,
              fontWeight: 900,
              fontSize: 24,
              whiteSpace: "nowrap",
            }}
          >
            ● AKTIV
          </div>
        </div>

        <div
          style={{
            background: "#edf8f1",
            borderRadius: 26,
            padding: 30,
            marginBottom: 28,
            border: "1px solid #dcefe2",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#16a34a",
              fontSize: 34,
              fontWeight: 900,
            }}
          >
            Sistemi është aktiv
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: "#475569",
              fontSize: 22,
            }}
          >
            {status}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 18,
            marginBottom: 28,
          }}
        >
          <InfoBox title="Printeri" value={activePrinter} />
          <InfoBox
            title="Ora"
            value={timeNow.toLocaleTimeString("sq-AL", { hour12: false })}
          />
          <InfoBox title="Business ID" value={businessId || "Mungon"} />
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 30,
            minHeight: 430,
            padding: 32,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 34,
              color: "#0f172a",
              fontWeight: 900,
            }}
          >
            Porositë që vijnë
          </h2>

          <p
            style={{
              margin: "8px 0 24px",
              color: "#64748b",
              fontSize: 20,
            }}
          >
            Këtu shfaqen faturat që janë printuar automatikisht.
          </p>

          {lastOrders.length === 0 ? (
            <div
              style={{
                height: 280,
                borderRadius: 24,
                background: "#f8fafc",
                border: "1px dashed #dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 54 }}>📦</div>
              <h3 style={{ margin: 0, fontSize: 34, color: "#0f172a" }}>
                Nuk ka porosi ende
              </h3>
              <p style={{ color: "#64748b", fontSize: 20, margin: 0 }}>
                Lëre këtë faqe hapur në desktop.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {lastOrders.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "18px 20px",
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 20, color: "#0f172a" }}>
                      {item.sourceLabel} {item.sourceNumber}
                    </strong>
                    <div style={{ color: "#64748b", marginTop: 4 }}>
                      Printuar në {item.time}
                    </div>
                  </div>

                  <strong style={{ fontSize: 20, color: "#0f172a" }}>
                    {item.total.toFixed(0)} ALL
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ title, value }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 22,
        padding: 22,
        minHeight: 96,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 16,
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#0f172a",
          fontSize: 20,
          fontWeight: 900,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}