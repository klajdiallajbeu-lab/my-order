import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../qz-signing";

import "./PorosiPage.css";
import { getOrders } from "../../api/ordersApi.js";

const DASHBOARD_FROM_KEY = "dashboard_from_date";
const DASHBOARD_TO_KEY = "dashboard_to_date";
const PAGE_SIZE_OPTIONS = [10, 20, 50];

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

  const [sourceFilter, setSourceFilter] = useState("tavoline");
  const [waiterFilter, setWaiterFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const businessId = useMemo(() => {
    const id = (localStorage.getItem("businessId") || "").trim();
    return id && id !== "undefined" && id !== "null" ? id : "";
  }, []);

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

      const res = await getOrders({ businessId, from, to });
      const list = normalizeOrders(res);

      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAllOrders(list);
    } catch (err) {
      console.error("getOrders error:", err?.response?.data || err);
      setAllOrders([]);
      setErrMsg(err?.response?.data?.message || "Nuk po arrij të marr porositë nga serveri.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const formatTime = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${d.toLocaleDateString("sq-AL")} ${d.toLocaleTimeString("sq-AL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}`;
  };

  const formatSourceLabel = (sourceType) => {
    const s = String(sourceType || "").toLowerCase();
    if (s === "tavoline") return "Tavolina";
    if (s === "dhoma") return "Dhoma";
    if (s === "cadra") return "Çadra";
    return String(sourceType || "-");
  };

  const formatStatusText = (status) => {
    const s = String(status || "pending").toLowerCase();
    if (s === "accepted") return "PRANUAR";
    if (s === "done") return "DËRGUAR";
    if (s === "cancelled") return "ANULUAR";
    return "PENDING";
  };

  const printOrder = useCallback(
    async (order) => {
      try {
        if (!order) return false;
        if (!window.qz && typeof qz === "undefined") return false;
        if (!businessId) return false;

        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
        }

        const printers = await qz.printers.find();

        const selectedPrinter =
          localStorage.getItem("invoicePrinter") ||
          localStorage.getItem("printerName") ||
          printers.find((p) => p.toLowerCase().includes("rongta")) ||
          printers.find((p) => p.toLowerCase().includes("rpp02")) ||
          printers[0];

        if (!selectedPrinter) return false;

        const config = qz.configs.create(selectedPrinter);

        const businessName = localStorage.getItem("hotelName") || order?.business?.name || "Biznesi";
        const nipt = order?.business?.nipt || localStorage.getItem("nipt") || "";
        const address = order?.business?.address || localStorage.getItem("address") || "";
        const printedBy = localStorage.getItem("name") || order?.acceptedBy || order?.createdBy || "-";
        const sourceLabel = `${formatSourceLabel(order?.sourceType)} ${order?.sourceNumber || "-"}`;
        const createdAt = new Date(order?.createdAt || Date.now()).toLocaleString("sq-AL", { hour12: false });
        const totalALL = Number(order?.totalALL || order?.total || 0);
        const line = "------------------------------\n";

        const formatLine = (left, right, width = 30) => {
          let l = String(left || "").trim();
          const r = String(right || "").trim();
          const maxLeft = width - r.length - 1;
          if (maxLeft <= 0) return `${l}\n${r}\n`;
          if (l.length > maxLeft) l = l.slice(0, maxLeft);
          return `${l}${" ".repeat(width - l.length - r.length)}${r}\n`;
        };

        const itemsLines = (order?.items || []).map((item) => {
          const qty = Number(item?.qty || 0);
          const price = Number(item?.price || 0);
          const name = item?.name || "Artikull";
          return formatLine(`${qty}x ${name}`, `${(qty * price).toFixed(0)} ALL`);
        });

        const data = [
          "\x1B\x40",
          "\x1B\x61\x01",
          `${businessName}\n`,
          ...(nipt ? [`NIPT: ${nipt}\n`] : []),
          ...(address ? [`${address}\n`] : []),
          "\nFATURE\n\n",
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
          formatLine("TOTAL:", `${totalALL.toFixed(0)} ALL`),
          "\x1B\x61\x01",
          "\nJu Faleminderit!\n",
          "www.myorderal.com\n",
          "\n\n\n",
        ];

        await qz.print(config, data);
        return true;
      } catch (err) {
        console.error("PRINT ERROR:", err);
        return false;
      }
    },
    [businessId]
  );

  const handlePrintOrder = async (e, order) => {
    e.stopPropagation();
    await printOrder(order);
  };

  // Filtrim i saktë: "3" duhet të përputhet VETËM me "3", jo "13"/"23"/"30"
  const orders = useMemo(() => {
    const cleanTable = tableFilter.trim().toLowerCase();
    const cleanWaiter = waiterFilter.trim().toLowerCase();

    return allOrders.filter((o) => {
      const matchesSource = String(o?.sourceType || "").toLowerCase() === sourceFilter;

      const matchesWaiter =
        !cleanWaiter || String(o?.createdBy || "").toLowerCase().includes(cleanWaiter);

      const matchesTable =
        !cleanTable || String(o?.sourceNumber || "").trim().toLowerCase() === cleanTable;

      return matchesSource && matchesWaiter && matchesTable;
    });
  }, [allOrders, sourceFilter, waiterFilter, tableFilter]);

  useEffect(() => {
    setPage(1);
  }, [sourceFilter, waiterFilter, tableFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, page, pageSize]);

  const pageNumbers = useMemo(() => {
    const nums = [];
    const max = Math.min(totalPages, 5);
    for (let i = 1; i <= max; i++) nums.push(i);
    return nums;
  }, [totalPages]);

  const clearFilters = () => {
    setWaiterFilter("");
    setTableFilter("");
  };

  return (
    <div className="orders-page">
      <div className="orders-premium-header">
        <div className="orders-header-left">
          
          <h1 className="orders-big-title">Porositë</h1>
          <p className="orders-description">
            Menaxho faturat sipas seksionit dhe filtro sipas kamarierit ose numrit të tavolinës.
          </p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${sourceFilter === "tavoline" ? "active" : ""}`} onClick={() => setSourceFilter("tavoline")} type="button">
          Tavolina
        </button>
        <button className={`tab ${sourceFilter === "dhoma" ? "active" : ""}`} onClick={() => setSourceFilter("dhoma")} type="button">
          Dhoma
        </button>
        <button className={`tab ${sourceFilter === "cadra" ? "active" : ""}`} onClick={() => setSourceFilter("cadra")} type="button">
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
              ? "Filtro sipas tavolinës (numër i saktë)"
              : sourceFilter === "dhoma"
              ? "Filtro sipas dhomës (numër i saktë)"
              : "Filtro sipas çadrës (numër i saktë)"
          }
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
        />

        <button type="button" className="clear-filters-btn" onClick={clearFilters}>
          Pastro
        </button>
      </div>

      {errMsg && <p className="orders-empty">{errMsg}</p>}

      {loading ? (
        <p className="orders-empty">Duke ngarkuar...</p>
      ) : orders.length === 0 ? (
        <p className="orders-empty">Nuk ka porosi për këtë filtër.</p>
      ) : (
        <>
          <div className="orders-table-card">
            <div className="orders-table-head">
              <span>{sourceFilter === "tavoline" ? "TAVOLINA" : sourceFilter === "dhoma" ? "DHOMA" : "ÇADRA"}</span>
              <span>KAMARIERI</span>
              <span>KOHA</span>
              <span>STATUSI</span>
              <span>TOTALI</span>
              <span>VEPRIME</span>
            </div>

            {pagedOrders.map((order) => {
              const statusText = formatStatusText(order?.status);
              const total = Number(order?.totalALL || order?.total || 0);

              return (
                <div key={order?._id} className="orders-table-row" onClick={() => order?._id && navigate(`/manager/order/${order._id}`)}>
                  <div className="orders-cell-main">
                    <span className="orders-row-icon">
                      {sourceFilter === "tavoline" ? "🍽️" : sourceFilter === "dhoma" ? "🛏️" : "⛱️"}
                    </span>
                    <div>
                      <div className="orders-row-title">
                        {formatSourceLabel(order?.sourceType)} {order?.sourceNumber || "-"}
                      </div>
                      <div className="orders-row-sub">Porosi #{String(order?._id || "").slice(-4)}</div>
                    </div>
                  </div>

                  <span>{order?.createdBy || "-"}</span>
                  <span>{formatTime(order?.createdAt)}</span>

                  <span>
                    <span className={`order-status-pill status-${String(order?.status || "pending").toLowerCase()}`}>
                      {statusText}
                    </span>
                  </span>

                  <span className="orders-row-total">{total.toFixed(0)} ALL</span>

                  <div className="orders-row-actions">
                    <button type="button" className="print-btn" onClick={(e) => handlePrintOrder(e, order)}>
                      Printo
                    </button>
                    <button
                      type="button"
                      className="details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (order?._id) navigate(`/manager/order/${order._id}`);
                      }}
                    >
                      Detaje →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="orders-pagination">
            <span className="orders-pagination-info">
              Duke shfaqur {(page - 1) * pageSize + 1} deri në {Math.min(page * pageSize, orders.length)} nga {orders.length} porosi
            </span>

            <div className="orders-pagination-controls">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ←
              </button>

              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === page ? "active" : ""}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}

              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                →
              </button>
            </div>

            <select className="orders-page-size" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} për faqe
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}