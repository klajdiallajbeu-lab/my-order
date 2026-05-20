import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WaiterOpenTablesDesktopPage.css";
import { api } from "../../api/http.js";

const CURRENT_WAITER_NAME =
  sessionStorage.getItem("waiterName") ||
  localStorage.getItem("waiterName") ||
  "Kamarjer";

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
    case "GBP":
      return "£";
    case "CHF":
      return "CHF";
    case "ALL":
    default:
      return "ALL";
  }
};

export default function WaiterOpenTablesDesktopPage() {
  const navigate = useNavigate();

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const [tables, setTables] = useState([]);
  const [openTableOrders, setOpenTableOrders] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingOpenTables, setLoadingOpenTables] = useState(true);
  const [closingTables, setClosingTables] = useState(false);
  const [error, setError] = useState("");
  const [firstLoadDone, setFirstLoadDone] = useState(false);

  const [printerSettings, setPrinterSettings] = useState({
    kitchenPrinterName: "",
    barPrinterName: "",
    invoicePrinterName: "",
  });
  const [businessSettings, setBusinessSettings] = useState({});

  const fetchPrinterSettings = useCallback(async () => {
    if (!businessId) return;

    try {
      const res = await api.get(`/business/${businessId}/settings`);
      const settings = res?.data?.settings || {};

      setBusinessSettings(settings);

      setPrinterSettings({
        kitchenPrinterName: settings.kitchenPrinterName || "",
        barPrinterName: settings.barPrinterName || "",
        invoicePrinterName: settings.invoicePrinterName || "",
      });
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

        const res = await api.get("/places", {
          params: {
            businessId,
            type: "table",
          },
        });

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
          .filter(
            (t) =>
              t.isOccupied &&
              String(t.occupiedByWaiterId || "") === String(CURRENT_WAITER_ID)
          )
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
              ownerId: String(CURRENT_WAITER_ID),
              createdAt: order.createdAt || null,
            };
          }

          grouped[tableNo].orderIds.push(order._id);
          grouped[tableNo].total += Number(order.total || 0);
          grouped[tableNo].totalALL += Number(order.totalALL || order.total || 0);

          (order.items || []).forEach((item) => {
            const existing = grouped[tableNo].items.find(
              (x) =>
                x.name === item.name && Number(x.price) === Number(item.price)
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
            itemsCount: table.items.reduce(
              (sum, item) => sum + Number(item.qty || 0),
              0
            ),
          }))
          .sort((a, b) => Number(a.tableNumber) - Number(b.tableNumber));

        setOpenTableOrders(result);
        setError("");

        setSelectedTables((prev) =>
          prev.filter((selected) =>
            result.some(
              (table) =>
                String(table.tableNumber) === String(selected.tableNumber)
            )
          )
        );
      } catch (err) {
        console.error(
          "Gabim duke lexuar tavolinat e hapura:",
          err?.response?.data || err
        );
        setError("Nuk mund të lexoj tavolinat e hapura.");
      } finally {
        if (!silent) setLoadingOpenTables(false);
      }
    },
    [businessId]
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

    return () => {
      mounted = false;
    };
  }, [fetchPrinterSettings, fetchTables, fetchOpenTableOrders]);

  const toggleTableSelection = (table) => {
    setSelectedTables((prev) => {
      const exists = prev.some(
        (item) => String(item.tableNumber) === String(table.tableNumber)
      );

      if (exists) {
        return prev.filter(
          (item) => String(item.tableNumber) !== String(table.tableNumber)
        );
      }

      return [...prev, table];
    });
  };

  const allSelected =
    openTableOrders.length > 0 &&
    selectedTables.length === openTableOrders.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedTables([]);
      return;
    }
    setSelectedTables(openTableOrders);
  };

  const selectedSummary = useMemo(() => {
    const selectedMap = new Map();
    selectedTables.forEach((t) => {
      selectedMap.set(String(t.tableNumber), true);
    });

    const chosen = openTableOrders.filter((t) =>
      selectedMap.has(String(t.tableNumber))
    );

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

  const ensureQzConnection = async () => {
    if (!window.qz) {
      alert("QZ Tray nuk u gjet.");
      return false;
    }

    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }

    return true;
  };

  const formatLine = (left, right, width = 30) => {
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

  const buildPrintData = (title = "FATURE TOTALE") => {
    const businessName = localStorage.getItem("hotelName") || "Biznesi";
    const nipt = localStorage.getItem("nipt") || "";
    const address = localStorage.getItem("address") || "";

    const printedDate = new Date().toLocaleString("sq-AL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const line = "------------------------------\n";

    const eurText = convertFromALL(
  selectedSummary.totalAmount,
  businessSettings?.eurRate,
  "EUR"
);

const usdText = convertFromALL(
  selectedSummary.totalAmount,
  businessSettings?.usdRate,
  "USD"
);

const gbpText = convertFromALL(
  selectedSummary.totalAmount,
  businessSettings?.gbpRate,
  "GBP"
);

const chfText = convertFromALL(
  selectedSummary.totalAmount,
  businessSettings?.chfRate,
  "CHF"
);

    const tableLines = selectedSummary.rows.map((row) =>
      formatLine(
        `Tavolina ${row.tableNumber}`,
        `${Number(row.totalALL || row.total || 0).toFixed(0)} ALL`
      )
    );

    const itemLines = selectedSummary.groupedItems.map((item) =>
      formatLine(
        `${Number(item.qty || 0)}x ${item.name}`,
        `${Number(item.total || 0).toFixed(0)} ALL`
      )
    );

    return [
      "\x1B\x40",
      "\x1B\x4D\x00",
      "\x1D\x21\x00",

      "\x1B\x61\x01",
      `${businessName}\n`,
      ...(nipt ? [`NIPT: ${nipt}\n`] : []),
      ...(address ? [`${address}\n`] : []),
      `\n*** ${title} ***\n\n`,

      "\x1B\x61\x00",
      line,
      `Kamarier: ${CURRENT_WAITER_NAME}\n`,
      `Data: ${printedDate}\n`,
      `Tavolina: ${selectedSummary.rows
        .map((t) => t.tableNumber)
        .join(", ")}\n`,
      line,

      ...tableLines,
      line,
      ...itemLines,
      line,
      formatLine("ARTIKUJ:", `${selectedSummary.totalItems}`),
      formatLine("TOTALI:", `${selectedSummary.totalAmount.toFixed(0)} ALL`),

      line,
formatLine("EUR:", eurText),
formatLine("USD:", usdText),
formatLine("GBP:", gbpText),
formatLine("CHF:", chfText),

      "\x1B\x61\x01",
      "\nJu Faleminderit!\n",
      "www.myOrder.al\n",
      "\n\n\n",
    ];
  };

  const handlePrint = async (mode = "printo") => {
    if (selectedSummary.rows.length === 0) {
      alert("Zgjidh të paktën një tavolinë.");
      return;
    }

    const printer = printerSettings.invoicePrinterName;
    if (!printer) {
      alert("Nuk është zgjedhur printeri i faturës.");
      return;
    }

    const connected = await ensureQzConnection();
    if (!connected) return;

    try {
      const config = window.qz.configs.create(printer);
      const title =
        mode === "fature" ? "FATURE TOTALE" : "PRINTO FATUREN TOTALE";
      const data = buildPrintData(title);

      await window.qz.print(config, data);

      alert(
        mode === "fature"
          ? "Fatura totale u printua."
          : "Printimi total u bë me sukses."
      );
    } catch (err) {
      console.error("Gabim ne printim:", err);
      alert("Nuk mund të printoj.");
    }
  };

const handleCloseSelectedTables = async () => {
  if (selectedSummary.rows.length === 0) {
    alert("Zgjidh të paktën një tavolinë.");
    return;
  }

  const ok = window.confirm(
    `Je i sigurt që dëshiron të mbyllësh ${selectedSummary.rows.length} tavolina?`
  );
  if (!ok) return;

  try {
    setClosingTables(true);

    for (const row of selectedSummary.rows) {
      await api.patch(
        `/tables/close/${row.tableNumber}`,
        {},
        {
          headers: {
            "x-waiter-id": CURRENT_WAITER_ID,
          },
        }
      );
    }

    alert("Tavolinat u mbyllën me sukses.");
    setSelectedTables([]);

    const tablesData = await fetchTables(true);
    await fetchOpenTableOrders(tablesData, true);
  } catch (err) {
    console.error(
      "Gabim ne mbylljen e tavolinave:",
      err?.response?.data || err
    );
    alert(err?.response?.data?.message || "Nuk mund të mbyll tavolinat.");
  } finally {
    setClosingTables(false);
  }
};

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleString("sq-AL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="waiter-open-tables-page">
      <header className="wot-header">
        <div className="wot-header-left">
          <h1>Tavolina të hapura</h1>
          <span>Shikon tavolinat e hapura dhe totalin e tyre</span>
        </div>

        <div className="wot-header-actions">
          <button
            type="button"
            className="wot-back-btn"
            onClick={() => navigate("/waiter")}
          >
            ← Kthehu
          </button>
        </div>
      </header>

      <div className="wot-main-grid">
        <section className="wot-panel wot-panel-left">
          <div className="wot-panel-title">Lista e tavolinave të hapura</div>

          {error && <div className="wot-error-bar">{error}</div>}

          {!firstLoadDone && (loadingTables || loadingOpenTables) && (
            <div className="wot-empty">Duke ngarkuar tavolinat...</div>
          )}

          {firstLoadDone && !error && openTableOrders.length === 0 && (
            <div className="wot-empty">Nuk ka tavolina të hapura.</div>
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
                      (item) =>
                        String(item.tableNumber) === String(table.tableNumber)
                    );

                    return (
                      <button
                        key={table.tableNumber}
                        type="button"
                        className={`wot-row ${checked ? "active" : ""}`}
                        onClick={() => toggleTableSelection(table)}
                      >
                        <div className="wot-col-check">
                          <span
                            className={`wot-checkbox ${
                              checked ? "checked" : ""
                            }`}
                          >
                            {checked ? "✓" : ""}
                          </span>
                        </div>

                        <div className="wot-col-id">{index + 1}</div>
                        <div className="wot-col-table">
                          Tavolina {table.tableNumber}
                        </div>
                        <div className="wot-col-open">
                          {formatDateTime(table.createdAt)}
                        </div>
                        <div className="wot-col-items">{table.itemsCount}</div>
                        <div className="wot-col-total">
                          {Number(
                            table.totalALL || table.total || 0
                          ).toLocaleString("sq-AL")}{" "}
                          L
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="wot-select-all-row">
                <label className="wot-select-all">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                  />
                  <span>Zgjidh të gjitha</span>
                </label>

                <div className="wot-selected-total">
                  <span>Total i zgjedhur:</span>
                  <strong>
                    {selectedSummary.totalAmount.toLocaleString("sq-AL")} L
                  </strong>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="wot-panel wot-panel-right">
          <div className="wot-panel-title">Parapamja e faturës totale</div>

          {selectedSummary.rows.length === 0 ? (
            <div className="wot-empty">
              Zgjidh një ose disa tavolina për të parë totalin.
            </div>
          ) : (
            <>
              <div className="wot-summary-card">
                <div className="wot-summary-top">
                  <div className="wot-summary-meta">
                    <div>
                      <span>Tavolina të zgjedhura:</span>
                      <strong>{selectedSummary.selectedTablesCount}</strong>
                    </div>
                    <div>
                      <span>Artikuj total:</span>
                      <strong>{selectedSummary.totalItems}</strong>
                    </div>
                  </div>

                  <div className="wot-grand-total">
                    <span>TOTALI PËR PAGESË:</span>
                    <strong>
                      {selectedSummary.totalAmount.toLocaleString("sq-AL")} L
                    </strong>
                  </div>
                </div>

                <div className="wot-summary-table">
                  <div className="wot-summary-head">
                    <div>Tavolina</div>
                    <div>Artikuj</div>
                    <div>Vlera</div>
                  </div>

                  {selectedSummary.rows.map((row) => (
                    <div key={row.tableNumber} className="wot-summary-row">
                      <div>Tavolina {row.tableNumber}</div>
                      <div>{row.itemsCount}</div>
                      <div>
                        {Number(row.totalALL || row.total || 0).toLocaleString(
                          "sq-AL"
                        )}{" "}
                        L
                      </div>
                    </div>
                  ))}

                  <div className="wot-summary-row total">
                    <div>TOTAL</div>
                    <div>{selectedSummary.totalItems}</div>
                    <div>
                      {selectedSummary.totalAmount.toLocaleString("sq-AL")} L
                    </div>
                  </div>
                </div>

                <div className="wot-items-preview">
                  <div className="wot-items-preview-title">Artikujt total</div>

                  {selectedSummary.groupedItems.map((item) => (
                    <div key={item.key} className="wot-item-preview-row">
                      <span>
                        {item.qty}x {item.name}
                      </span>
                      <span>
                        {Number(item.total || 0).toFixed(2)}{" "}
                        {getCurrencySymbol(item.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="wot-actions-row">
                <button
                  type="button"
                  className="wot-big-btn primary"
                  onClick={() => handlePrint("printo")}
                >
                  Printo Faturën Totale
                </button>

                <button
                  type="button"
                  className="wot-big-btn"
                  onClick={() => handlePrint("fature")}
                >
                  Faturë Totale
                </button>

                <button
                  type="button"
                  className="wot-big-btn danger"
                  onClick={handleCloseSelectedTables}
                  disabled={closingTables}
                >
                  {closingTables ? "Duke mbyllur..." : "Mbyll të zgjedhurat"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="wot-info-bar">
        Fatura totale përfshin të gjitha tavolinat e zgjedhura.
      </div>
    </div>
  );
}