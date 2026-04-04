import { useCallback, useEffect, useMemo, useState } from "react";
import "./PorosiPage.css";
import { getOrders } from "../../api/ordersApi.js";
import { useNavigate } from "react-router-dom";

const DASHBOARD_FROM_KEY = "dashboard_from_date";
const DASHBOARD_TO_KEY = "dashboard_to_date";

const getSavedDate = (key) => localStorage.getItem(key) || null;

const normalizeOrders = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.orders)) return res.orders;
  if (Array.isArray(res?.data?.orders)) return res.data.orders;
  return [];
};

export default function PorosiPage() {
  const navigate = useNavigate();

  const [openOrderId, setOpenOrderId] = useState(null);
  const [sourceFilter, setSourceFilter] = useState("tavoline");
  const [waiterFilter, setWaiterFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  const businessId = useMemo(() => {
    const id = (localStorage.getItem("businessId") || "").trim();
    return id && id !== "undefined" && id !== "null" ? id : "";
  }, []);

  const printedBy = useMemo(() => {
    const name = (localStorage.getItem("name") || "").trim();
    return name || "-";
  }, []);

  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setErrMsg("");

      if (!businessId) {
        setAllOrders([]);
        setErrMsg("Mungon businessId. Hyni sërish në sistem.");
        return;
      }

      const from = getSavedDate(DASHBOARD_FROM_KEY);
      const to = getSavedDate(DASHBOARD_TO_KEY);

      const res = await getOrders({
        businessId,
        from,
        to,
      });

      const list = normalizeOrders(res);

      list.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );

      setAllOrders(list);
    } catch (err) {
      console.error("getOrders error:", err?.response?.data || err);
      setAllOrders([]);
      setErrMsg(
        err?.response?.data?.message ||
          "Nuk po arrij të marr porositë nga serveri."
      );
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadOrders();
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, [loadOrders]);

  const orders = useMemo(() => {
    return allOrders.filter((o) => {
      const matchesSource =
        (o?.sourceType || "").toLowerCase() === sourceFilter;

      const matchesWaiter = String(o?.createdBy || "")
        .toLowerCase()
        .includes(waiterFilter.toLowerCase().trim());

      const matchesTable = String(o?.sourceNumber || "")
        .toLowerCase()
        .includes(tableFilter.toLowerCase().trim());

      return matchesSource && matchesWaiter && matchesTable;
    });
  }, [allOrders, sourceFilter, waiterFilter, tableFilter]);

  const formatTime = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleTimeString("sq-AL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSourceLabel = (sourceType) => {
    const s = (sourceType || "").toLowerCase();
    if (s === "tavoline") return "TAVOLINË";
    if (s === "dhoma") return "DHOMË";
    if (s === "cadra") return "ÇADËR";
    return (sourceType || "-").toUpperCase();
  };

  const formatStatusText = (status) => {
    const s = (status || "pending").toLowerCase();
    if (s === "accepted") return "PRANUAR";
    if (s === "done") return "DËRGUAR";
    if (s === "cancelled") return "ANULUAR";
    return "PENDING";
  };

  const handleToggleOrder = (orderId) => {
    setOpenOrderId((prev) => (prev === orderId ? null : orderId));
  };

const handlePrintOrder = async (e, order) => {
  e.stopPropagation();

  try {
    if (!order) {
      alert("Porosia mungon.");
      return;
    }

    if (!window.qz) {
      alert("QZ Tray nuk u gjet.");
      return;
    }

    if (!businessId) {
      alert("Mungon businessId.");
      return;
    }

    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }

    console.log("BUSINESS:", order.business);
    console.log("SETTINGS:", order?.business?.settings);

    const printers = await window.qz.printers.find();
    const selectedPrinter =
      printers.find((p) => p === "RONGTA RPP02 Series Printer(1)") ||
      printers.find((p) => p.includes("RONGTA")) ||
      printers.find((p) => p.includes("RPP02"));

    if (!selectedPrinter) {
      alert("Printeri Rongta nuk u gjet në listë.");
      return;
    }

    const config = window.qz.configs.create(selectedPrinter);

    const businessName =
      order?.business?.name ||
      localStorage.getItem("hotelName") ||
      localStorage.getItem("businessName") ||
      "Biznesi";

    const nipt =
      order?.business?.nipt ||
      localStorage.getItem("nipt") ||
      "";

    const address =
      order?.business?.address ||
      localStorage.getItem("address") ||
      "";

    const printedBy =
      localStorage.getItem("name") ||
      order?.acceptedBy ||
      order?.createdBy ||
      "-";

    const sourceLabel =
      `${formatSourceLabel(order?.sourceType)} ${order?.sourceNumber || "-"}`.trim();

    const d = new Date(order?.createdAt || Date.now());
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const createdAt = `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;

    const settings = order?.business?.settings || {};

    const eurRate = Number(settings?.eurRate) || 0;
    const usdRate = Number(settings?.usdRate) || 0;
    const gbpRate = Number(settings?.gbpRate) || 0;
    const chfRate = Number(settings?.chfRate) || 0;

    const currency = String(order?.currency || "ALL").toUpperCase();
    const rawTotal = Number(order?.total || 0);
    const savedTotalALL = Number(order?.totalALL || 0);
    const savedRate = Number(order?.exchangeRateUsed || 0);

    let finalTotalALL = 0;

    if (savedTotalALL > 0) {
      finalTotalALL = savedTotalALL;
    } else if (currency === "ALL") {
      finalTotalALL = rawTotal;
    } else if (savedRate > 0) {
      finalTotalALL = rawTotal * savedRate;
    } else if (currency === "EUR" && eurRate > 0) {
      finalTotalALL = rawTotal * eurRate;
    } else if (currency === "USD" && usdRate > 0) {
      finalTotalALL = rawTotal * usdRate;
    } else if (currency === "GBP" && gbpRate > 0) {
      finalTotalALL = rawTotal * gbpRate;
    } else if (currency === "CHF" && chfRate > 0) {
      finalTotalALL = rawTotal * chfRate;
    } else {
      finalTotalALL = rawTotal;
    }

    const totalEUR = eurRate > 0 ? (finalTotalALL / eurRate).toFixed(2) : "-";
    const totalUSD = usdRate > 0 ? (finalTotalALL / usdRate).toFixed(2) : "-";
    const totalGBP = gbpRate > 0 ? (finalTotalALL / gbpRate).toFixed(2) : "-";
    const totalCHF = chfRate > 0 ? (finalTotalALL / chfRate).toFixed(2) : "-";

    const LINE_WIDTH = 30;
    const line = "------------------------------\n";

    const padRight = (text, length) => {
      const str = String(text ?? "");
      if (str.length >= length) return str.slice(0, length);
      return str + " ".repeat(length - str.length);
    };

    const padLeft = (text, length) => {
      const str = String(text ?? "");
      if (str.length >= length) return str.slice(0, length);
      return " ".repeat(length - str.length) + str;
    };

    const makeLeftRightLine = (left, right) => {
      const l = String(left ?? "");
      const r = String(right ?? "");
      const spaces = LINE_WIDTH - l.length - r.length;

      if (spaces <= 1) {
        return `${l}\n${padLeft(r, LINE_WIDTH)}\n`;
      }

      return `${l}${" ".repeat(spaces)}${r}\n`;
    };

    const shortName = (text, max = 18) => {
      const t = String(text || "").trim();
      return t.length > max ? `${t.slice(0, max - 1)}…` : t;
    };

    const itemValueInALL = (it) => {
      const qty = Number(it?.qty) || 0;
      const price = Number(it?.price) || 0;
      const itemTotal = qty * price;

      if (currency === "ALL") return itemTotal;

      if (savedRate > 0) return itemTotal * savedRate;
      if (currency === "EUR" && eurRate > 0) return itemTotal * eurRate;
      if (currency === "USD" && usdRate > 0) return itemTotal * usdRate;
      if (currency === "GBP" && gbpRate > 0) return itemTotal * gbpRate;
      if (currency === "CHF" && chfRate > 0) return itemTotal * chfRate;

      return itemTotal;
    };

    const itemsLines = (order?.items || []).flatMap((it) => {
      const qty = Number(it?.qty) || 0;
      const name = `${qty}x ${shortName(it?.name || "Artikull", 18)}`;
      const valueALL = `${itemValueInALL(it).toFixed(0)} ALL`;

      if ((name.length + valueALL.length) <= LINE_WIDTH) {
        return [makeLeftRightLine(name, valueALL)];
      }

      return [
        `${name}\n`,
        `${padLeft(valueALL, LINE_WIDTH)}\n`,
      ];
    });

    const data = [
      "\x1B\x40",
      "\x1B\x61\x01",
      `${businessName}\n`,
      ...(nipt ? [`NIPT: ${nipt}\n`] : []),
      ...(address ? [`${address}\n`] : []),
      "FATURE\n",
      "\n",

      "\x1B\x61\x00",
      line,
      `ID: ${order?._id || "-"}\n`,
      `Burimi: ${sourceLabel}\n`,
      `Status: ${formatStatusText(order?.status)}\n`,
      `Printuar nga: ${printedBy}\n`,
      `Data: ${createdAt}\n`,
      line,

      ...itemsLines,

      line,
      `${padLeft(`TOTAL: ${finalTotalALL.toFixed(0)} ALL`, LINE_WIDTH)}\n`,
      `EUR: ${totalEUR}\n`,
      `USD: ${totalUSD}\n`,
      `GBP: ${totalGBP}\n`,
      `CHF: ${totalCHF}\n`,
      line,

      "\x1B\x61\x01",
      "Ju Faleminderit!\n",
      "www.myOrder.al\n",
      "\n\n",
    ];

    await window.qz.print(config, data);
  } catch (err) {
    console.error("PRINT ERROR:", err);
    alert("Gabim gjatë printimit");
  }
};

  const clearFilters = () => {
    setWaiterFilter("");
    setTableFilter("");
  };

  return (
    <div className="orders-page">
      <div className="orders-header">
        <div>
          <h1 className="orders-title">Porositë</h1>
          <p className="orders-subtitle">
            Menaxho faturat sipas seksionit dhe filtro sipas kamarierit ose
            numrit të tavolinës.
          </p>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${sourceFilter === "tavoline" ? "active" : ""}`}
          onClick={() => setSourceFilter("tavoline")}
          type="button"
        >
          Tavolina
        </button>

        <button
          className={`tab ${sourceFilter === "dhoma" ? "active" : ""}`}
          onClick={() => setSourceFilter("dhoma")}
          type="button"
        >
          Dhoma
        </button>

        <button
          className={`tab ${sourceFilter === "cadra" ? "active" : ""}`}
          onClick={() => setSourceFilter("cadra")}
          type="button"
        >
          Çadra
        </button>
      </div>

      <div className="orders-filters">
        <input
          type="text"
          placeholder="Filtro sipas kamarierit"
          value={waiterFilter}
          onChange={(e) => setWaiterFilter(e.target.value)}
        />

        <input
          type="text"
          placeholder={
            sourceFilter === "tavoline"
              ? "Filtro sipas tavolinës"
              : sourceFilter === "dhoma"
              ? "Filtro sipas dhomës"
              : "Filtro sipas çadrës"
          }
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
        />

        <button
          type="button"
          className="clear-filters-btn"
          onClick={clearFilters}
        >
          Pastro
        </button>
      </div>

      {errMsg && <p className="orders-empty">{errMsg}</p>}

      {loading ? (
        <p className="orders-empty">Duke ngarkuar...</p>
      ) : orders.length === 0 ? (
        <p className="orders-empty">Nuk ka porosi për këtë filtër.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const time = formatTime(order?.createdAt);
            const isOpen = openOrderId === order?._id;
            const statusText = formatStatusText(order?.status);

            return (
              <div
                key={order?._id}
                className={`order-card ${isOpen ? "open" : ""}`}
                onClick={() => handleToggleOrder(order?._id)}
              >
                <div className="order-top">
                  <div className="order-left">
                    <div className="order-line-top">
                      <span className="order-table">
                        {formatSourceLabel(order?.sourceType)}{" "}
                        {order?.sourceNumber || "-"}
                      </span>

                      <span className="order-created">
                        Krijuar nga <b>{order?.createdBy || "-"}</b>
                        {time !== "-" && <> · {time}</>}
                      </span>
                    </div>
                  </div>

                  <div className="order-right">
                    <div className="order-total">
                      {(Number(order?.totalALL) || Number(order?.total) || 0).toFixed(0)} ALL
                    </div>

                    <div
                      className={`order-status-pill status-${
                        (order?.status || "pending").toLowerCase()
                      }`}
                    >
                      {statusText}
                    </div>

                    <div className="order-actions">
                      <button
                        type="button"
                        className="print-btn"
                        onClick={(e) => handlePrintOrder(e, order)}
                      >
                        Printo
                      </button>

                      <button
                        type="button"
                        className="details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (order?._id) {
                            navigate(`/manager/order/${order._id}`);
                          }
                        }}
                      >
                        Detaje
                      </button>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="order-items">
                    {(order?.items || []).length === 0 ? (
                      <div className="order-item-line muted">
                        Nuk ka produkte për këtë faturë.
                      </div>
                    ) : (
                      order.items.map((it, i) => {
                        const qty = Number(it?.qty) || 1;
                        const name = it?.name || "-";
                        const price = Number(it?.price) || 0;
                        const currency = String(order?.currency || "ALL").toUpperCase();

                        return (
                          <div key={i} className="order-item-line">
                            <span className="item-left">
                              {qty}x {name}
                            </span>

                            <span className="item-right">
                              {currency === "ALL"
                                ? `${price.toFixed(0)} ALL`
                                : `${price.toFixed(2)} ${currency}`}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}