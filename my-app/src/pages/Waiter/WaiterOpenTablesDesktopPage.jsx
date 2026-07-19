import "../../qz-signing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WaiterOpenTablesDesktopPage.css";
import { api } from "../../api/http.js";
import { socket } from "../../realtime/socket.js";

const CURRENT_WAITER_NAME =
  sessionStorage.getItem("waiterName") ||
  localStorage.getItem("waiterName") ||
  "Kamarjer";

const getCurrencySymbol = (currency) => {
  switch (currency) {
    case "EUR": return "€";
    case "USD": return "$";
    case "GBP": return "£";
    case "CHF": return "CHF";
    case "ALL":
    default: return "ALL";
  }
};

export default function WaiterOpenTablesDesktopPage() {
  const [currentWaiterId, setCurrentWaiterId] = useState("");

  useEffect(() => {
    const id = sessionStorage.getItem("waiterId") || localStorage.getItem("waiterId") || "";
    setCurrentWaiterId(id);
  }, []);

  const navigate = useNavigate();
  const businessId = useMemo(() => (localStorage.getItem("businessId") || "").trim(), []);

  const [tables, setTables] = useState([]);
  const [openTableOrders, setOpenTableOrders] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingOpenTables, setLoadingOpenTables] = useState(true);
  const [closingTables, setClosingTables] = useState(false);
  const [error, setError] = useState("");
  const [firstLoadDone, setFirstLoadDone] = useState(false);

  const [businessSettings, setBusinessSettings] = useState({});

  const fetchPrinterSettings = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await api.get(`/business/${businessId}/settings`);
      setBusinessSettings(res?.data?.settings || {});
    } catch (err) {
      console.error("Gabim te printer settings:", err?.response?.data || err);
    }
  }, [businessId]);

  const fetchTables = useCallback(
    async (silent = false) => {
      if (!businessId) {
        setError("Mungon businessId.");
        setLoadingTables(false);
        return [];
      }

      try {
        if (!silent) setLoadingTables(true);
        const res = await api.get("/places", { params: { businessId, type: "table" } });
        const data = Array.isArray(res?.data) ? res.data : [];
        setTables(data);
        return data;
      } catch (err) {
        console.error("Gabim te tavolinat:", err?.response?.data || err);
        setError("Nuk mund të ngarkoj tavolinat.");
        setTables([]);
        return [];
      } finally {
        if (!silent) setLoadingTables(false);
      }
    },
    [businessId]
  );

  const fetchOpenTableOrders = useCallback(
    async (tablesInput = null, silent = false) => {
      if (!businessId) {
        setLoadingOpenTables(false);
        return;
      }

      try {
        if (!silent) setLoadingOpenTables(true);

        const sourceTables = Array.isArray(tablesInput) ? tablesInput : [];
        const myOccupiedCodes = sourceTables
          .filter((t) => t.isOccupied && String(t.occupiedByWaiterId || "") === String(currentWaiterId))
          .map((t) => String(t.code || "").trim());

        if (myOccupiedCodes.length === 0) {
          setOpenTableOrders([]);
          setSelectedTables([]);
          setError("");
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
          const tableNo = String(order.sourceNumber || "").trim();

          if (!grouped[tableNo]) {
            grouped[tableNo] = {
              tableNumber: tableNo,
              orderIds: [],
              items: [],
              total: 0,
              totalALL: 0,
              currency: order.currency || "ALL",
              ownerId: String(currentWaiterId),
              createdAt: order.createdAt || null,
            };
          }

          grouped[tableNo].orderIds.push(order._id);
          grouped[tableNo].total += Number(order.total || 0);
          grouped[tableNo].totalALL += Number(order.totalALL || order.total || 0);

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

        const result = Object.values(grouped)
          .map((table) => ({
            ...table,
            itemsCount: table.items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
          }))
          .sort((a, b) => Number(a.tableNumber) - Number(b.tableNumber));

        setOpenTableOrders(result);
        setError("");

        setSelectedTables((prev) =>
          prev.filter((selected) =>
            result.some((table) => String(table.tableNumber) === String(selected.tableNumber))
          )
        );
      } catch (err) {
        console.error("Gabim duke lexuar tavolinat e hapura:", err?.response?.data || err);
        setError("Nuk mund të lexoj tavolinat e hapura.");
      } finally {
        if (!silent) setLoadingOpenTables(false);
      }
    },
    [businessId, currentWaiterId]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await fetchPrinterSettings();
      const tablesData = await fetchTables(false);
      if (mounted) {
        await fetchOpenTableOrders(tablesData, false);
        setFirstLoadDone(true);
      }
    };

    init();
    return () => { mounted = false; };
  }, [fetchPrinterSettings, fetchTables, fetchOpenTableOrders]);

  const toggleTableSelection = (table) => {
    setSelectedTables((prev) => {
      const exists = prev.some((item) => String(item.tableNumber) === String(table.tableNumber));
      if (exists) return prev.filter((item) => String(item.tableNumber) !== String(table.tableNumber));
      return [...prev, table];
    });
  };

  const allSelected = openTableOrders.length > 0 && selectedTables.length === openTableOrders.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedTables([]);
      return;
    }
    setSelectedTables(openTableOrders);
  };

  const selectedSummary = useMemo(() => {
    const selectedMap = new Map();
    selectedTables.forEach((t) => selectedMap.set(String(t.tableNumber), true));

    const chosen = openTableOrders.filter((t) => selectedMap.has(String(t.tableNumber)));

    const groupedItemsMap = new Map();
    let totalAmount = 0;
    let totalItems = 0;

    chosen.forEach((table) => {
      totalAmount += Number(table.totalALL || table.total || 0);
      totalItems += Number(table.itemsCount || 0);

      (table.items || []).forEach((item) => {
        const key = `${item.name}-${Number(item.price || 0)}`;
        const itemTotal = Number(item.qty || 0) * Number(item.price || 0);

        if (groupedItemsMap.has(key)) {
          const existing = groupedItemsMap.get(key);
          existing.qty += Number(item.qty || 0);
          existing.total += itemTotal;
        } else {
          groupedItemsMap.set(key, {
            key,
            name: item.name,
            qty: Number(item.qty || 0),
            price: Number(item.price || 0),
            total: itemTotal,
            currency: "ALL",
          });
        }
      });
    });

    return {
      rows: chosen,
      selectedTablesCount: chosen.length,
      totalItems,
      totalAmount,
      groupedItems: Array.from(groupedItemsMap.values()),
    };
  }, [openTableOrders, selectedTables]);

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

  const handlePrint = async () => {
    if (selectedSummary.rows.length === 0) return;

    const payload = {
      businessId,
      eventType: "tableInvoice",
      invoiceId: `desktop-total-${Date.now()}`,
      sourceType: "tavoline",
      sourceNumber: selectedSummary.rows.map((t) => t.tableNumber).join(", "),
      tableNumber: selectedSummary.rows.map((t) => t.tableNumber).join(", "),
      waiterName: CURRENT_WAITER_NAME,
      createdBy: CURRENT_WAITER_NAME,
      items: selectedSummary.groupedItems.map((item) => ({
        name: item.name,
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
      })),
      total: Number(selectedSummary.totalAmount || 0),
      totalALL: Number(selectedSummary.totalAmount || 0),
      createdAt: new Date().toISOString(),
    };

    if (!socket.connected) socket.connect();
    socket.emit("joinBusiness", businessId);

    setTimeout(() => {
      socket.emit("table:invoice", payload);
    }, 300);
  };

  const handleCloseSelectedTables = async () => {
    if (selectedSummary.rows.length === 0) return;

    const ok = window.confirm("Je i sigurt që do t'i mbyllësh tavolinat e zgjedhura?");
    if (!ok) return;

    try {
      setClosingTables(true);

      for (const row of selectedSummary.rows) {
        await api.patch(`/tables/close/${row.tableNumber}`, {});
      }

      setSelectedTables([]);
      const tablesData = await fetchTables(true);
      await fetchOpenTableOrders(tablesData, true);
    } catch (err) {
      console.error("Gabim ne mbylljen e tavolinave:", err?.response?.data || err);
    } finally {
      setClosingTables(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("sq-AL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    });
  };

  const hasSelection = selectedSummary.rows.length > 0;

  return (
    <div className="waiter-open-tables-page">
      <header className="wot-header">
        <div className="wot-header-left">
          <h1>Tavolina të hapura</h1>
          <span>Shikon tavolinat e hapura dhe totalin e tyre</span>
        </div>

        <div className="wot-header-actions">
          <button type="button" className="wot-back-btn" onClick={() => navigate("/waiter")}>
            ← Kthehu
          </button>
        </div>
      </header>

      <div className="wot-main-grid">
        <section className="wot-panel wot-panel-list">
          <div className="wot-panel-title">Lista e tavolinave të hapura</div>

          {error && <div className="wot-error-bar">{error}</div>}

          {!firstLoadDone && (loadingTables || loadingOpenTables) && (
            <div className="wot-empty small">Duke ngarkuar tavolinat...</div>
          )}

          {firstLoadDone && !error && openTableOrders.length === 0 && (
            <div className="wot-empty small">Nuk ka tavolina të hapura.</div>
          )}

          {firstLoadDone && openTableOrders.length > 0 && (
            <>
              <div className="wot-table-wrap">
                <div className="wot-table-head">
                  <div className="wot-col-check">✓</div>
                  <div className="wot-col-id">#</div>
                  <div className="wot-col-table">Tavolina</div>
                  <div className="wot-col-open">Hapja</div>
                  <div className="wot-col-items">Artikuj</div>
                  <div className="wot-col-total">Totali</div>
                </div>

                <div className="wot-table-body">
                  {openTableOrders.map((table, index) => {
                    const checked = selectedTables.some(
                      (item) => String(item.tableNumber) === String(table.tableNumber)
                    );

                    return (
                      <button
                        key={table.tableNumber}
                        type="button"
                        className={`wot-row ${checked ? "active" : ""}`}
                        onClick={() => toggleTableSelection(table)}
                      >
                        <div className="wot-col-check">
                          <span className={`wot-checkbox ${checked ? "checked" : ""}`}>
                            {checked ? "✓" : ""}
                          </span>
                        </div>
                        <div className="wot-col-id">{index + 1}</div>
                        <div className="wot-col-table">Tavolina {table.tableNumber}</div>
                        <div className="wot-col-open">{formatDateTime(table.createdAt)}</div>
                        <div className="wot-col-items">{table.itemsCount}</div>
                        <div className="wot-col-total">
                          {Number(table.totalALL || table.total || 0).toLocaleString("sq-AL")} L
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="wot-select-all-row">
                <label className="wot-select-all">
                  <input type="checkbox" checked={allSelected} onChange={handleToggleSelectAll} />
                  <span>Zgjidh të gjitha</span>
                </label>

                <div className="wot-selected-total">
                  <span>Total i zgjedhur:</span>
                  <strong>{selectedSummary.totalAmount.toLocaleString("sq-AL")} L</strong>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="wot-panel wot-panel-preview">
          <div className="wot-panel-title">Parapamja e faturës totale</div>

          {!hasSelection ? (
            <div className="wot-illustration-wrap">
              <div className="wot-illustration receipt">
                <div className="ill-receipt-icon">🧾</div>
                <div className="ill-dollar-badge">$</div>
              </div>
              <div className="wot-illustration-title">Zgjidh një ose më shumë tavolina</div>
              <div className="wot-illustration-sub">Parapamja e faturës totale do të shfaqet këtu.</div>
            </div>
          ) : (
            <div className="wot-items-preview">
              {selectedSummary.groupedItems.map((item) => (
                <div key={item.key} className="wot-item-preview-row">
                  <span>{item.qty}x {item.name}</span>
                  <span>{Number(item.total || 0).toFixed(2)} {getCurrencySymbol(item.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="wot-panel wot-panel-summary">
          <div className="wot-panel-title">Përmbledhja</div>

          <div className="wot-stat-grid">
            <div className="wot-stat-box">
              <span>Tavolina të zgjedhura</span>
              <strong>{selectedSummary.selectedTablesCount}</strong>
            </div>

            <div className="wot-stat-box">
              <span>Totali i përzgjedhur</span>
              <strong className="blue">{selectedSummary.totalAmount.toLocaleString("sq-AL")} L</strong>
            </div>
          </div>

          <button
            type="button"
            className="wot-main-action-btn"
            onClick={handlePrint}
            disabled={!hasSelection}
          >
            🖨 FATURA TOTALE
          </button>

          <button
            type="button"
            className="wot-secondary-action-btn"
            onClick={handleCloseSelectedTables}
            disabled={!hasSelection || closingTables}
          >
            {closingTables ? "Duke mbyllur..." : "Mbyll të zgjedhurat"}
          </button>
        </section>
      </div>

    </div>
  );
}