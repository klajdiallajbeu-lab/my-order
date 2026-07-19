import "../../qz-signing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PorosiMobilePage.css";
import { getOrders } from "../../api/ordersApi.js";

const DASHBOARD_FROM_KEY = "dashboard_from_date";
const DASHBOARD_TO_KEY   = "dashboard_to_date";
const getSavedDate = (key) => localStorage.getItem(key) || null;

const normalizeOrders = (res) => {
  if (Array.isArray(res))               return res;
  if (Array.isArray(res?.data))         return res.data;
  if (Array.isArray(res?.orders))       return res.orders;
  if (Array.isArray(res?.data?.orders)) return res.data.orders;
  return [];
};

const ICON_COLORS = ["icon-blue", "icon-green", "icon-purple", "icon-orange"];

export default function PorosiMobilePage() {
  const navigate = useNavigate();

  const [openOrderId,  setOpenOrderId]  = useState(null);
  const [sourceFilter, setSourceFilter] = useState("tavoline");
  const [waiterFilter, setWaiterFilter] = useState("");
  const [tableFilter,  setTableFilter]  = useState("");
  const [allOrders,    setAllOrders]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [errMsg,       setErrMsg]       = useState("");

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
      const to   = getSavedDate(DASHBOARD_TO_KEY);
      const res  = await getOrders({ businessId, from, to });
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

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const formatTime = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleTimeString("sq-AL", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  };

  const formatSourceLabel = (sourceType) => {
    const s = (sourceType || "").toLowerCase();
    if (s === "tavoline") return "Tavolinë";
    if (s === "dhoma")    return "Dhomë";
    if (s === "cadra")    return "Çadër";
    return sourceType || "-";
  };

  const getTotal = (order) => Number(order?.totalALL) || Number(order?.total) || 0;

  const orders = useMemo(() => {
    return allOrders.filter((o) => {
      const matchesSource = (o?.sourceType || "").toLowerCase() === sourceFilter;
      const matchesWaiter = String(o?.createdBy    || "").toLowerCase().includes(waiterFilter.toLowerCase().trim());
      const matchesTable  = String(o?.sourceNumber || "").toLowerCase().includes(tableFilter.toLowerCase().trim());
      return matchesSource && matchesWaiter && matchesTable;
    });
  }, [allOrders, sourceFilter, waiterFilter, tableFilter]);

  const clearFilters = () => { setWaiterFilter(""); setTableFilter(""); };

  const tabLabel = sourceFilter === "tavoline" ? "tavolinë" : sourceFilter === "dhoma" ? "dhomë" : "çadër";

  return (
    <div className="orders-mobile-page">

      {/* HEADER */}
      <div className="orders-mobile-header">
        <div className="orders-mobile-header-row">
          <div className="orders-mobile-header-left">
            <div className="orders-mobile-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2"/>
                <line x1="9" y1="7" x2="15" y2="7"/>
                <line x1="9" y1="11" x2="15" y2="11"/>
                <line x1="9" y1="15" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <div className="orders-mobile-title">Porositë</div>
              <div className="orders-mobile-subtitle">
                Shiko, filtro dhe hap detajet e faturave sipas tavolinës, dhomës ose çadrës.
              </div>
            </div>
          </div>
          <button className="orders-mobile-refresh" onClick={loadOrders}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="mobile-tabs">
        <button type="button" className={`mobile-tab ${sourceFilter === "tavoline" ? "active" : ""}`} onClick={() => setSourceFilter("tavoline")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Tavolina
        </button>
        <button type="button" className={`mobile-tab ${sourceFilter === "dhoma" ? "active" : ""}`} onClick={() => setSourceFilter("dhoma")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 0 4H2"/>
            <path d="M2 12h18a2 2 0 0 1 0 4H2"/>
          </svg>
          Dhoma
        </button>
        <button type="button" className={`mobile-tab ${sourceFilter === "cadra" ? "active" : ""}`} onClick={() => setSourceFilter("cadra")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"/>
            <line x1="12" y1="2" x2="12" y2="5"/>
          </svg>
          Çadra
        </button>
      </div>

      {/* FILTERS */}
      <div className="mobile-filters">
        <div className="mobile-search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <input type="text" placeholder="Kërko kamarier..." value={waiterFilter} onChange={(e) => setWaiterFilter(e.target.value)} />
        </div>
        <div className="mobile-search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          <input type="text" placeholder={`Kërko ${tabLabel}...`} value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} />
        </div>
        <button type="button" className="mobile-clear-btn" onClick={clearFilters}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Pastro
        </button>
      </div>

      {/* CONTENT */}
      {errMsg && <div className="mobile-empty">{errMsg}</div>}

      {loading ? (
        <div className="mobile-empty">Duke ngarkuar...</div>
      ) : orders.length === 0 && !errMsg ? (
        <div className="mobile-empty">Nuk ka fatura për këtë filtër.</div>
      ) : (
        <div className="mobile-orders-list">
          {orders.map((order, idx) => {
            const isOpen     = openOrderId === order?._id;
            const items      = order?.items || [];
            const total      = getTotal(order);
            const color      = ICON_COLORS[idx % ICON_COLORS.length];
            const iconStroke = color === "icon-blue" ? "#1A56DB" : color === "icon-green" ? "#10b981" : color === "icon-purple" ? "#8b5cf6" : "#f59e0b";

            return (
              <article key={order?._id} className="mobile-order-card"
                onClick={() => setOpenOrderId((prev) => prev === order?._id ? null : order?._id)}>

                <div className="mobile-order-top">
                  <div className={`mobile-order-icon ${color}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </div>
                  <div className="mobile-order-info">
                    <div className="mobile-order-title">
                      {formatSourceLabel(order?.sourceType)} {order?.sourceNumber || "-"}
                    </div>
                    <div className="mobile-order-meta">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {formatTime(order?.createdAt)} · {items.length} artikuj
                    </div>
                  </div>
                  <div className="mobile-order-chevron">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points={isOpen ? "18 15 12 9 6 15" : "9 18 15 12 9 6"}/>
                    </svg>
                  </div>
                </div>

                <div className="mobile-order-bottom">
                  <div>
                    <div className="mobile-order-total-label">Totali</div>
                    <div className="mobile-order-total-amount">{total.toFixed(0)} ALL</div>
                  </div>
                  <div className="mobile-order-waiter" onClick={(e) => e.stopPropagation()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    {order?.createdBy || "-"}
                  </div>
                </div>

                <div className="mobile-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="mobile-btn print">Printo</button>
                  <button type="button" className="mobile-btn details"
                    onClick={() => { if (order?._id) navigate(`/manager/order/${order._id}`); }}>
                    Detaje
                  </button>
                </div>

                {isOpen && (
                  <div className="mobile-items">
                    {items.length === 0 ? (
                      <div className="mobile-item-line">Nuk ka produkte për këtë faturë.</div>
                    ) : (
                      items.map((it, i) => {
                        const qty      = Number(it?.qty)   || 1;
                        const price    = Number(it?.price) || 0;
                        const name     = it?.name || "-";
                        const currency = String(order?.currency || "ALL").toUpperCase();
                        return (
                          <div key={i} className="mobile-item-line">
                            <span>{qty}x {name}</span>
                            <strong>{currency === "ALL" ? `${price.toFixed(0)} ALL` : `${price.toFixed(2)} ${currency}`}</strong>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}