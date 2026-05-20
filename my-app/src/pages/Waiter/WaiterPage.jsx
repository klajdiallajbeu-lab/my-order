import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WaiterPage.css";
import { socket } from "../../realtime/socket.js";
import { api } from "../../api/http.js";
import {
  closeTableApi,
  closeWaiterShiftApi,
  getWaiterShiftPreviewApi,
} from "../../api/ordersApi.js";

const CURRENT_WAITER_NAME =
  sessionStorage.getItem("waiterName") || "Kamarjer 1";

const CURRENT_WAITER_ID =
  sessionStorage.getItem("waiterId") ||
  localStorage.getItem("waiterId") ||
  "";

const getCurrencySymbol = (currency) => {
  switch (currency) {
    case "EUR":
      return "€";
    case "USD":
      return "$";
    case "CHF":
      return "CHF";
    case "GBP":
      return "£";
    case "ALL":
    default:
      return "ALL";
  }
};

export default function WaiterPage({ onLogout }) {
  const navigate = useNavigate();

  const [locationType, setLocationType] = useState("tavoline");
  const [locationNumber, setLocationNumber] = useState("");

  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const [error, setError] = useState("");
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  const [showOpenTablesPage, setShowOpenTablesPage] = useState(false);
  const [openTableOrders, setOpenTableOrders] = useState([]);
  const [loadingOpenTables, setLoadingOpenTables] = useState(false);

  const [showShiftReportPage, setShowShiftReportPage] = useState(false);
  const [shiftReport, setShiftReport] = useState(null);
  const [loadingShiftReport, setLoadingShiftReport] = useState(false);

  const [printerSettings, setPrinterSettings] = useState({
    kitchenPrinterName: "",
    barPrinterName: "",
    invoicePrinterName: "",
  });

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const handleLogout = () => {
    const ok = window.confirm("Je i sigurt që dëshiron të dalësh?");
    if (!ok) return;

    if (typeof onLogout === "function") return onLogout();

    sessionStorage.clear();
    window.location.replace("/login");
  };

  const fetchPrinterSettings = useCallback(async () => {
    if (!businessId) return;

    try {
      const res = await api.get(`/business/${businessId}/settings`);
      const settings = res?.data?.settings || {};

      setPrinterSettings({
        kitchenPrinterName: settings.kitchenPrinterName || "",
        barPrinterName: settings.barPrinterName || "",
        invoicePrinterName: settings.invoicePrinterName || "",
      });
    } catch (err) {
      console.error(
        "Gabim te printer settings:",
        err?.response?.data || err
      );
    }
  }, [businessId]);

  const fetchTables = useCallback(async () => {
    if (!businessId) return;

    try {
      setLoadingTables(true);

      const res = await api.get("/places", {
        params: {
          businessId,
          type: "table",
        },
      });

      setTables(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Gabim te tavolinat:", err?.response?.data || err);
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, [businessId]);

  const fetchIncomingOrders = useCallback(async () => {
    if (!businessId) return;

    try {
      const res = await api.get("/orders", {
        params: { businessId },
        headers: { "Cache-Control": "no-cache" },
      });

      const data = res?.data;
      if (!Array.isArray(data)) return;

      const mapped = data.map((o) => ({
        id: o._id,
        sourceType: o.sourceType,
        sourceNumber: o.sourceNumber,
        items: o.items || [],
        total: Number(o.total || 0),
        totalALL: Number(o.totalALL || 0),
        currency: o.currency || "ALL",
        status: o.status || "pending",
        acceptedBy: o.acceptedBy || "",
        createdBy: o.createdBy || "",
        destination: o.destination || "",
        batchId: o.batchId || "",
        business: o.business || null,
        createdAt: o.createdAt || null,
      }));

      setIncomingOrders(mapped);
    } catch (err) {
      console.error("Gabim duke lexuar porositë:", err?.response?.data || err);
    }
  }, [businessId]);

  useEffect(() => {
    fetchIncomingOrders();
    fetchPrinterSettings();
  }, [fetchIncomingOrders, fetchPrinterSettings]);

  useEffect(() => {
    if (locationType === "tavoline") {
      fetchTables();
    }
  }, [locationType, fetchTables]);

  useEffect(() => {
    if (!businessId) return;

    const join = () => socket.emit("joinBusiness", businessId);

    if (socket.connected) join();
    socket.on("connect", join);

    const onOrdersCreated = (payload) => {
      if (
        payload?.businessId &&
        String(payload.businessId) !== String(businessId)
      ) {
        return;
      }
      fetchIncomingOrders();
      fetchTables();
    };

    const onOrdersChanged = (payload) => {
      if (
        payload?.businessId &&
        String(payload.businessId) !== String(businessId)
      ) {
        return;
      }
      fetchIncomingOrders();
      fetchTables();
    };

    socket.on("orders:created", onOrdersCreated);
    socket.on("orders:changed", onOrdersChanged);

    return () => {
      socket.off("connect", join);
      socket.off("orders:created", onOrdersCreated);
      socket.off("orders:changed", onOrdersChanged);
    };
  }, [businessId, fetchIncomingOrders, fetchTables]);

  useEffect(() => {
    if (!businessId) return;
    const interval = setInterval(() => {
      fetchIncomingOrders();
      fetchTables();
    }, 20000);
    return () => clearInterval(interval);
  }, [businessId, fetchIncomingOrders, fetchTables]);

  const filteredIncoming = useMemo(
    () => incomingOrders.filter((o) => o.sourceType === locationType),
    [incomingOrders, locationType]
  );

  const pendingDhoma = useMemo(
    () =>
      incomingOrders.filter(
        (o) => o.sourceType === "dhoma" && o.status === "pending"
      ).length,
    [incomingOrders]
  );

  const pendingCadra = useMemo(
    () =>
      incomingOrders.filter(
        (o) => o.sourceType === "cadra" && o.status === "pending"
      ).length,
    [incomingOrders]
  );

  const occupiedTablesMap = useMemo(() => {
    const map = new Map();

    tables.forEach((t) => {
      const code = String(t.code || "").trim();
      map.set(code, {
        isOccupied: !!t.isOccupied,
        occupiedByWaiterId: String(t.occupiedByWaiterId || ""),
        placeId: t._id,
      });
    });

    return map;
  }, [tables]);


  const formatLine = (left, right, width = 26) => {
    let l = String(left || "").trim();
    const r = String(right || "").trim();

    const maxLeft = width - r.length - 1;

    if (maxLeft <= 0) return `${l}\n${r}\n`;

    if (l.length > maxLeft) {
      l = l.slice(0, maxLeft);
    }

    return `${l}${" ".repeat(width - l.length - r.length)}${r}\n`;
  };

  const convertFromALL = (amount, rate, code) => {
    const r = Number(rate);
    if (!r || r <= 0) return "-";
    return `${(Number(amount) / r).toFixed(2)} ${code}`;
  };

const printShiftReport = async () => {
  return;
};

  const fetchOpenTableOrders = useCallback(async () => {
    if (!businessId) return;

    try {
      setLoadingOpenTables(true);

      const myOccupiedCodes = tables
        .filter(
          (t) =>
            t.isOccupied &&
            String(t.occupiedByWaiterId || "") === String(CURRENT_WAITER_ID)
        )
        .map((t) => String(t.code || "").trim());

      if (myOccupiedCodes.length === 0) {
        setOpenTableOrders([]);
        return;
      }

      const res = await api.get("/orders", {
        params: { businessId },
        headers: { "Cache-Control": "no-cache" },
      });

      const data = Array.isArray(res?.data) ? res.data : [];

const onlyMyOpenTables = data.filter((o) => {
  const status = String(o?.status || "").toLowerCase();

  return (
    o.sourceType === "tavoline" &&
    String(o.sourceNumber || "").trim() !== "" &&
    status !== "done" &&
    status !== "closed" &&
    status !== "cancelled" &&
    myOccupiedCodes.includes(String(o.sourceNumber || "").trim())
  );
});

      const grouped = {};

      onlyMyOpenTables.forEach((order) => {
        const tableNo = String(order.sourceNumber).trim();

        if (!grouped[tableNo]) {
          grouped[tableNo] = {
            tableNumber: tableNo,
            orderIds: [],
            items: [],
            total: 0,
            currency: order.currency || "ALL",
            ownerId: String(CURRENT_WAITER_ID),
          };
        }

        grouped[tableNo].orderIds.push(order._id);
        grouped[tableNo].total += Number(order.total || 0);

        (order.items || []).forEach((item) => {
          const existing = grouped[tableNo].items.find(
            (x) => x.name === item.name && Number(x.price) === Number(item.price)
          );

          if (existing) {
            existing.qty += Number(item.qty || 0);
          } else {
            grouped[tableNo].items.push({
              name: item.name,
              qty: Number(item.qty || 0),
              price: Number(item.price || 0),
            });
          }
        });
      });

      const result = Object.values(grouped).sort(
        (a, b) => Number(a.tableNumber) - Number(b.tableNumber)
      );

      setOpenTableOrders(result);
    } catch (err) {
      console.error(
        "Gabim duke lexuar tavolinat e hapura:",
        err?.response?.data || err
      );
      alert("Nuk mund të lexoj tavolinat e hapura.");
    } finally {
      setLoadingOpenTables(false);
    }
  }, [businessId, tables]);

  const handleOpenTables = async () => {
    setShowSettings(false);
    setShowOpenTablesPage(true);
    await fetchOpenTableOrders();
  };

const handleCloseTable = async (table) => {
  const isMine = String(table.ownerId || "") === String(CURRENT_WAITER_ID);

  if (!isMine) {
    alert("Nuk mund të mbyllësh tavolinën e një kamarjeri tjetër.");
    return;
  }

  const ok = window.confirm(
    `Ta mbyll tavolinën ${table.tableNumber} dhe ta dërgoj faturën për printim?`
  );

  if (!ok) return;

  try {
    const res = await closeTableApi({
      sourceType: "tavoline",
      sourceNumber: table.tableNumber,
    });

    const invoice = res?.data?.invoice;

    if (!invoice) {
      throw new Error("Fatura totale nuk u kthye nga serveri.");
    }

    const payload = {
      businessId,
      sourceType: "tavoline",
      sourceNumber: table.tableNumber,
      tableNumber: table.tableNumber,

      waiterName: CURRENT_WAITER_NAME,
      createdBy: CURRENT_WAITER_NAME,

      items: invoice.items || table.items || [],

      total: Number(invoice.totalALL || invoice.total || table.total || 0),
      totalALL: Number(invoice.totalALL || invoice.total || table.total || 0),

      business: invoice.business || null,
      createdAt: invoice.createdAt || new Date().toISOString(),
    };
    console.log("📱 DERGOJ FATURË TE MANAGER:", payload);

if (!socket.connected) {
  socket.connect();
}

socket.emit("joinBusiness", businessId);

setTimeout(() => {
  socket.emit("table:invoice", payload);
}, 300);

    const place = tables.find(
      (t) =>
        String(t.code || "").trim() === String(table.tableNumber).trim()
    );

    if (place?._id) {
      try {
        await api.patch(`/places/${place._id}/release`);
        console.log("✅ Table released");
      } catch (releaseErr) {
        console.error(
          "❌ Release FAILED:",
          releaseErr?.response?.data || releaseErr
        );
      }
    }

    setOpenTableOrders((prev) =>
      prev.filter(
        (t) => String(t.tableNumber) !== String(table.tableNumber)
      )
    );

    if (String(locationNumber) === String(table.tableNumber)) {
      setLocationNumber("");
    }

    setShowOpenTablesPage(false);

    await fetchIncomingOrders();
    await fetchTables();
    await fetchOpenTableOrders();

    alert("Tavolina u mbyll dhe fatura u dërgua për printim te manageri.");
  } catch (err) {
    console.error("Close table error:", err?.response?.data || err);

    alert(
      err?.response?.data?.message ||
        err?.message ||
        "Nuk mund të mbyll tavolinën."
    );
  }
};

  const handleSelectTable = (tableCode) => {
    const code = String(tableCode || "").trim();
    if (!code) return;

    const occ = occupiedTablesMap.get(code);

    const isTakenByOther =
      occ?.isOccupied &&
      occ?.occupiedByWaiterId &&
      String(occ.occupiedByWaiterId) !== String(CURRENT_WAITER_ID);

    if (isTakenByOther) {
      setError("Kjo tavolinë është zënë nga një kamarjer tjetër.");
      return;
    }

    setError("");
    setLocationNumber(code);
    navigate(`/waiter/table/${code}`);
  };

  const handleAcceptIncoming = async (orderId) => {
    const ok = window.confirm("Ta marrësh këtë porosi?");
    if (!ok) return;

    try {
      await api.patch(`/orders/${orderId}/status`, {
        status: "accepted",
        acceptedBy: CURRENT_WAITER_NAME,
      });

      await fetchIncomingOrders();
    } catch (err) {
      console.error(err);
      alert("Gabim gjatë accept.");
    }
  };

  const handleMarkDone = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: "done" });
      await fetchIncomingOrders();
    } catch (err) {
      console.error(
        "Gabim te updateOrderStatus (done):",
        err?.response?.data || err
      );
      fetchIncomingOrders();
    }
  };

const handleCloseShift = async () => {
  try {
    if (!businessId) {
      alert("Mungon businessId.");
      return;
    }

    setLoadingShiftReport(true);

    const res = await getWaiterShiftPreviewApi({
      businessId,
      waiterName: CURRENT_WAITER_NAME,
    });

    const report = res?.data?.report;

    if (!report) {
      throw new Error("Raporti i xhiros nuk u kthye nga serveri.");
    }

    setShiftReport(report);
    setShowSettings(false);
    setShowShiftReportPage(true);

    await fetchIncomingOrders();
    await fetchTables();
  } catch (err) {
    console.error("Gabim te closeWaiterShift:", err?.response?.data || err);

    alert(
      err?.response?.data?.message ||
        err?.message ||
        "Nuk mund të hap xhiron."
    );
  } finally {
    setLoadingShiftReport(false);
  }
};

  const shiftTotalALL = Number(shiftReport?.totalALL || 0);

  const shiftSettings = shiftReport?.business?.settings || {};

  const shiftEUR = convertFromALL(
    shiftTotalALL,
    Number(shiftSettings?.eurRate) || 0,
    "EUR"
  );

  const shiftUSD = convertFromALL(
    shiftTotalALL,
    Number(shiftSettings?.usdRate) || 0,
    "USD"
  );

  const shiftGBP = convertFromALL(
    shiftTotalALL,
    Number(shiftSettings?.gbpRate) || 0,
    "GBP"
  );

  const shiftCHF = convertFromALL(
    shiftTotalALL,
    Number(shiftSettings?.chfRate) || 0,
    "CHF"
  );

  const shiftPrintedDate = shiftReport?.createdAt
    ? new Date(shiftReport.createdAt).toLocaleString("sq-AL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "";

  return (
    <div className="waiter-page">
<header className="waiter-header">
  <div className="waiter-header-top">
    <div className="waiter-user-row">
      <div className="waiter-user-icon">♙</div>

      <div className="waiter-header-left">
        <h1>Kamarjeri</h1>
        <span className="waiter-subtitle">
          Bëj porosi shpejt nga telefoni
        </span>
      </div>
    </div>

    <div className="waiter-header-actions">
      <button
        type="button"
        className="waiter-settings-icon"
        onClick={() => setShowSettings((p) => !p)}
      >
        ⚙
      </button>

<button
  type="button"
  className="waiter-logout-btn"
  onClick={handleLogout}
  aria-label="Dil"
  title="Dil"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
    <path d="M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8" />
  </svg>
</button>
    </div>
  </div>
</header>
      {showSettings && (
        <section className="waiter-settings-panel">
          <div className="waiter-settings-card">
            <div className="waiter-settings-title-row">
              <h3 className="waiter-settings-title">Settings</h3>
            </div>

            <div className="waiter-settings-grid">
              <button
                type="button"
                className="waiter-settings-item"
                onClick={handleOpenTables}
              >
                <span className="waiter-settings-item-text">
                  Tavolina të hapura
                </span>
              </button>

              <button
                type="button"
                className="waiter-settings-item danger"
                onClick={handleCloseShift}
              >
                <span className="waiter-settings-item-text">
                  Mbyll Xhiron
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {showShiftReportPage && (
        <section className="waiter-open-tables-page">
          <div className="waiter-open-tables-header">
            <h2>Xhiro e Kamarjerit</h2>

            <button
              type="button"
              className="waiter-back-btn"
              onClick={() => {
                setShowShiftReportPage(false);
                setShiftReport(null);
              }}
            >
              Kthehu
            </button>
          </div>

          {loadingShiftReport && <p>Duke ngarkuar xhiron...</p>}

          {!loadingShiftReport && !shiftReport && (
            <p>Nuk ka raport xhiroje për t'u shfaqur.</p>
          )}

          {!loadingShiftReport && shiftReport && (
            <div className="open-table-card">
              <div className="open-table-top">
                <div className="open-table-title">
                  *** XHIRO DITORE E KAMARIERIT ***
                </div>

                <div className="open-table-total">
                  {shiftTotalALL.toFixed(2)} ALL
                </div>
              </div>

              <div
                style={{ marginBottom: "14px", color: "#475569", lineHeight: 1.7 }}
              >
                <div>
                  <b>Biznesi:</b>{" "}
                  {shiftReport?.business?.name ||
                    localStorage.getItem("hotelName") ||
                    "Biznesi"}
                </div>
                <div>
                  <b>Kamarieri:</b>{" "}
                  {shiftReport?.waiterName || CURRENT_WAITER_NAME}
                </div>
                <div>
                  <b>Porosi:</b> {shiftReport?.orderCount || 0}
                </div>
                <div>
                  <b>Data:</b> {shiftPrintedDate}
                </div>
              </div>

              <div className="open-table-items">
                {(shiftReport.items || []).map((item, i) => (
                  <div key={i} className="open-table-item-row">
                    <span>
                      {Number(item.qty || 0)}x {item.name}
                    </span>

                    <span>
                      {(
                        Number(item.qty || 0) * Number(item.price || 0)
                      ).toFixed(2)}{" "}
                      ALL
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderTop: "1px solid #e2e8f0",
                  marginTop: "14px",
                  paddingTop: "14px",
                  display: "grid",
                  gap: "8px",
                }}
              >
                <div className="open-table-item-row">
                  <span><b>TOTAL</b></span>
                  <span><b>{shiftTotalALL.toFixed(2)} ALL</b></span>
                </div>

                <div className="open-table-item-row">
                  <span>EUR</span>
                  <span>{shiftEUR}</span>
                </div>

                <div className="open-table-item-row">
                  <span>USD</span>
                  <span>{shiftUSD}</span>
                </div>

                <div className="open-table-item-row">
                  <span>GBP</span>
                  <span>{shiftGBP}</span>
                </div>

                <div className="open-table-item-row">
                  <span>CHF</span>
                  <span>{shiftCHF}</span>
                </div>

                <div className="open-table-actions">
                  <button
                    type="button"
                    className="waiter-print-btn"
                  onClick={async () => {
  try {
    if (!businessId) {
      alert("Mungon businessId.");
      return;
    }

    const res = await closeWaiterShiftApi({
      businessId,
      waiterName: CURRENT_WAITER_NAME,
    });

    const report = res?.data?.report;

    if (!report) {
      throw new Error(
        "Raporti final i xhiros nuk u kthye nga serveri."
      );
    }

    const payload = {
      businessId,
      ...report,
      waiterName: CURRENT_WAITER_NAME,
      createdAt: new Date().toISOString(),
    };

    console.log("💰 DERGOJ XHIRON:", payload);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("joinBusiness", businessId);

    setTimeout(() => {
      socket.emit("waiter:shift-report", payload);
    }, 300);

    setShiftReport(null);
    setShowShiftReportPage(false);

    await fetchIncomingOrders();
    await fetchTables();

    alert("Xhiro u mbyll dhe u dërgua për printim.");
  } catch (err) {
    console.error(
      "Gabim te handlePrintShiftReport:",
      err?.response?.data || err
    );

    alert(
      err?.response?.data?.message ||
        err?.message ||
        "Nuk mund të printoj xhiron."
    );
  }
}}
                  >
                    Printo Xhiron
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {showOpenTablesPage && (
        <section className="waiter-open-tables-page">
          <div className="waiter-open-tables-header">
            <h2>Tavolina të hapura</h2>

            <button
              type="button"
              className="waiter-back-btn"
              onClick={() => setShowOpenTablesPage(false)}
            >
              Kthehu
            </button>
          </div>

          {loadingOpenTables && <p>Duke ngarkuar tavolinat...</p>}

          {!loadingOpenTables && openTableOrders.length === 0 && (
            <p>Nuk ka tavolina të hapura.</p>
          )}

          {!loadingOpenTables &&
            openTableOrders.map((table) => (
              <div key={table.tableNumber} className="open-table-card">
                <div className="open-table-top">
                  <div className="open-table-title">
                    Tavolina {table.tableNumber}
                  </div>

                  <div className="open-table-total">
                    {Number(table.total).toFixed(2)} {table.currency}
                  </div>
                </div>

                <div className="open-table-items">
                  {table.items.map((item, i) => (
                    <div key={i} className="open-table-item-row">
                      <span>
                        {item.qty}x {item.name}
                      </span>

                      <span>
                        {(Number(item.qty) * Number(item.price)).toFixed(2)}{" "}
                        {table.currency}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="open-table-actions single">
  <button
    type="button"
    className="waiter-invoice-btn close-table-main-btn"
    onClick={() => handleCloseTable(table)}
  >
    Mbyll Tavolinën
  </button>
</div>
              </div>
            ))}
        </section>
      )}

      {!showOpenTablesPage && !showShiftReportPage && (
        <section className="waiter-location">
          <div className="waiter-location-type">
            <button
              className={
                locationType === "tavoline"
                  ? "wl-type-btn active"
                  : "wl-type-btn"
              }
              onClick={() => {
                setLocationType("tavoline");
                setLocationNumber("");
                setError("");
              }}
            >
              Tavolinë
            </button>

            <button
              className={
                locationType === "dhoma" ? "wl-type-btn active" : "wl-type-btn"
              }
              onClick={() => {
                setLocationType("dhoma");
                setLocationNumber("");
                setError("");
              }}
            >
              Dhoma {pendingDhoma > 0 && <span className="wl-badge">{pendingDhoma}</span>}
            </button>

            <button
              className={
                locationType === "cadra" ? "wl-type-btn active" : "wl-type-btn"
              }
              onClick={() => {
                setLocationType("cadra");
                setLocationNumber("");
                setError("");
              }}
            >
              Çadra {pendingCadra > 0 && <span className="wl-badge">{pendingCadra}</span>}
            </button>
          </div>

          {locationType === "tavoline" ? (
            <div className="tables-grid">
              {loadingTables && (
                <p className="waiter-location-hint">Duke ngarkuar tavolinat...</p>
              )}

              {!loadingTables && tables.length === 0 && (
                <p className="waiter-location-hint">
                  Nuk ka tavolina të krijuara.
                </p>
              )}

              {!loadingTables &&
                [...tables]
                  .sort((a, b) => Number(a.code) - Number(b.code))
                  .map((t) => {
                    const code = String(t.code);
                    const occ = occupiedTablesMap.get(code);
                    const isOccupied = !!occ?.isOccupied;
                    const isMine =
                      isOccupied &&
                      String(occ?.occupiedByWaiterId || "") ===
                        String(CURRENT_WAITER_ID);
                    const isBlocked = isOccupied && !isMine;

                    return (
                      <button
                        key={t._id}
                        type="button"
                        disabled={isBlocked}
                        className={`
                          table-box
                          ${String(locationNumber) === code ? "active" : ""}
                          ${isMine ? "mine" : ""}
                          ${isBlocked ? "blocked" : ""}
                        `}
                        onClick={() => {
                          if (isBlocked) return;
                          handleSelectTable(code);
                        }}
                      >
                        {t.code}
                      </button>
                    );
                  })}
            </div>
          ) : (
            <section className="waiter-incoming">
              <h2>Porosi nga {locationType === "dhoma" ? "dhomat" : "çadrat"}</h2>

              {filteredIncoming.length === 0 && (
                <div className="incoming-empty">Nuk ka porosi nga klientët.</div>
              )}

              {filteredIncoming.map((order) => (
                <div
                  key={order.id}
                  className={`incoming-card status-${order.status}`}
                >
                  <div className="incoming-top">
                    <div className="incoming-left">
                      <div className="incoming-source">
                        {order.sourceType.toUpperCase()} {order.sourceNumber}
                      </div>
                      <div className="incoming-status">
                        {order.status === "pending" && "Në pritje"}
                        {order.status === "accepted" && "E pranuar"}
                        {order.status === "done" && "E dërguar"}
                      </div>
                    </div>

                    <div className="incoming-total">
                      {Number(order.total).toFixed(2)}{" "}
                      {getCurrencySymbol(order.currency)}
                    </div>
                  </div>

                  <div className="incoming-items">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="incoming-item-row">
                        <span>
                          {it.qty}x {it.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="incoming-actions">
                    {order.status === "pending" && (
                      <button
                        type="button"
                        className="incoming-btn accept"
                        onClick={() => handleAcceptIncoming(order.id)}
                      >
                        Accepto
                      </button>
                    )}

                    {order.status === "accepted" &&
                      order.acceptedBy === CURRENT_WAITER_NAME && (
                        <>
                          <span className="incoming-info">
                            E pranuar nga ti ({CURRENT_WAITER_NAME})
                          </span>
                          <button
                            type="button"
                            className="incoming-btn done"
                            onClick={() => handleMarkDone(order.id)}
                          >
                            Dërgo u krye
                          </button>
                        </>
                      )}

                    {order.status === "accepted" &&
                      order.acceptedBy !== CURRENT_WAITER_NAME && (
                        <span className="incoming-info">
                          E marrë nga {order.acceptedBy}
                        </span>
                      )}

                    {order.status === "done" && (
                      <span className="incoming-info">✔ Porosia është dërguar</span>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

          {error && <p className="error-text">{error}</p>}
        </section>
      )}
    </div>
  );
}