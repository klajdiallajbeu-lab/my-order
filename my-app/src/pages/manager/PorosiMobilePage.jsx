import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PorosiMobilePage.css";
import { getOrders } from "../../api/ordersApi.js";

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

export default function PorosiMobilePage() {
  const navigate = useNavigate();

  const [openOrderId, setOpenOrderId] = useState(null);
  const [sourceFilter, setSourceFilter] = useState("tavoline");
  const [waiterFilter, setWaiterFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

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
  }, [loadOrders]);

  const formatTime = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleTimeString("sq-AL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatSourceLabel = (sourceType) => {
    const s = (sourceType || "").toLowerCase();
    if (s === "tavoline") return "Tavolinë";
    if (s === "dhoma") return "Dhomë";
    if (s === "cadra") return "Çadër";
    return sourceType || "-";
  };

  const formatStatusText = (status) => {
    const s = (status || "pending").toLowerCase();
    if (s === "accepted") return "Pranuar";
    if (s === "done") return "Dërguar";
    if (s === "cancelled") return "Anuluar";
    return "Pending";
  };

  const getTotal = (order) =>
    Number(order?.totalALL) || Number(order?.total) || 0;

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

  const clearFilters = () => {
    setWaiterFilter("");
    setTableFilter("");
  };

  return (
    <div className="orders-mobile-page">
      <section className="orders-mobile-header">
        <div className="orders-mobile-badge">Faturat</div>
        <h1 className="orders-mobile-title">Porositë</h1>
        <p className="orders-mobile-subtitle">
          Shiko, filtro dhe hap detajet e faturave sipas tavolinës, dhomës ose
          çadrës.
        </p>
      </section>

      <div className="mobile-tabs">
        <button
          type="button"
          className={`mobile-tab ${sourceFilter === "tavoline" ? "active" : ""}`}
          onClick={() => setSourceFilter("tavoline")}
        >
          Tavolina
        </button>

        <button
          type="button"
          className={`mobile-tab ${sourceFilter === "dhoma" ? "active" : ""}`}
          onClick={() => setSourceFilter("dhoma")}
        >
          Dhoma
        </button>

        <button
          type="button"
          className={`mobile-tab ${sourceFilter === "cadra" ? "active" : ""}`}
          onClick={() => setSourceFilter("cadra")}
        >
          Çadra
        </button>
      </div>

      <div className="mobile-filters">
        <input
          type="text"
          placeholder="Kërko kamarier..."
          value={waiterFilter}
          onChange={(e) => setWaiterFilter(e.target.value)}
        />

        <input
          type="text"
          placeholder={
            sourceFilter === "tavoline"
              ? "Kërko tavolinë..."
              : sourceFilter === "dhoma"
              ? "Kërko dhomë..."
              : "Kërko çadër..."
          }
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
        />

        <button type="button" className="mobile-clear-btn" onClick={clearFilters}>
          Pastro
        </button>
      </div>

      {errMsg && <div className="mobile-empty">{errMsg}</div>}

      {loading ? (
        <div className="mobile-empty">Duke ngarkuar...</div>
      ) : orders.length === 0 ? (
        <div className="mobile-empty">Nuk ka fatura për këtë filtër.</div>
      ) : (
        <div className="mobile-orders-list">
          {orders.map((order) => {
            const isOpen = openOrderId === order?._id;
            const items = order?.items || [];
            const total = getTotal(order);

            return (
              <article
                key={order?._id}
                className="mobile-order-card"
                onClick={() =>
                  setOpenOrderId((prev) =>
                    prev === order?._id ? null : order?._id
                  )
                }
              >
                <div className="mobile-order-head">
                  <div>
                    <div className="mobile-order-title">
                      {formatSourceLabel(order?.sourceType)}{" "}
                      {order?.sourceNumber || "-"}
                    </div>

                    <div className="mobile-order-meta">
                      {formatTime(order?.createdAt)} · {items.length} artikuj
                    </div>
                  </div>

                  <div
                    className={`mobile-status status-${(
                      order?.status || "pending"
                    ).toLowerCase()}`}
                  >
                    {formatStatusText(order?.status)}
                  </div>
                </div>

                <div className="mobile-invoice-box">
                  <div>
                    <div className="mobile-invoice-label">Totali</div>
                    <div className="mobile-order-total">
                      {total.toFixed(0)} ALL
                    </div>
                  </div>

                  <div className="mobile-waiter-pill">
                    {order?.createdBy || "-"}
                  </div>
                </div>

                <div
                  className="mobile-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button type="button" className="mobile-btn print">
                    Printo
                  </button>

                  <button
                    type="button"
                    className="mobile-btn details"
                    onClick={() => {
                      if (order?._id) navigate(`/manager/order/${order._id}`);
                    }}
                  >
                    Detaje
                  </button>
                </div>

                {isOpen && (
                  <div className="mobile-items">
                    {items.length === 0 ? (
                      <div className="mobile-item-line">
                        Nuk ka produkte për këtë faturë.
                      </div>
                    ) : (
                      items.map((it, i) => {
                        const qty = Number(it?.qty) || 1;
                        const price = Number(it?.price) || 0;
                        const name = it?.name || "-";
                        const currency = String(
                          order?.currency || "ALL"
                        ).toUpperCase();

                        return (
                          <div key={i} className="mobile-item-line">
                            <span>
                              {qty}x {name}
                            </span>

                            <strong>
                              {currency === "ALL"
                                ? `${price.toFixed(0)} ALL`
                                : `${price.toFixed(2)} ${currency}`}
                            </strong>
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