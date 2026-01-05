// src/pages/manager/PorosiPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "./PorosiPage.css";
import { getOrders } from "../../api/ordersApi.js";
import { useNavigate } from "react-router-dom";

const DASHBOARD_FROM_KEY = "dashboard_from_date";
const DASHBOARD_TO_KEY = "dashboard_to_date";

const getSavedDate = (key) => localStorage.getItem(key) || null;

// ✅ normalizon përgjigjen: pranon array direkt OSE axios response
const normalizeOrders = (res) => {
  if (Array.isArray(res)) return res; // p.sh. getOrders kthen direkt array
  if (Array.isArray(res?.data)) return res.data; // axios response
  if (Array.isArray(res?.orders)) return res.orders; // ndonjë backend kthen {orders: []}
  if (Array.isArray(res?.data?.orders)) return res.data.orders;
  return [];
};

export default function PorosiPage() {
  const navigate = useNavigate();

  const businessId = useMemo(() => {
    const id = (localStorage.getItem("businessId") || "").trim();
    return id && id !== "undefined" && id !== "null" ? id : "";
  }, []);

  const [sourceFilter, setSourceFilter] = useState("all"); // all | tavoline | dhoma | cadra
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

      const params = { businessId, _ts: Date.now() };
      if (from && to) {
        params.from = from;
        params.to = to;
      }

      const res = await getOrders(params);
      const list = normalizeOrders(res);

      // ✅ rendit në mënyrë të sigurt (më të rejat sipër)
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setAllOrders(list);
    } catch (err) {
      console.error("❌ getOrders error:", err?.response?.data || err);
      setAllOrders([]);
      setErrMsg(err?.response?.data?.message || "Nuk po arrij të marr porositë nga serveri.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // ✅ Polling
  useEffect(() => {
    loadOrders();
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, [loadOrders]);

  const orders = useMemo(() => {
    if (sourceFilter === "all") return allOrders;
    return allOrders.filter(
      (o) => (o?.sourceType || "").toLowerCase() === sourceFilter
    );
  }, [allOrders, sourceFilter]);

  const formatTime = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" });
  };

  const formatStatusText = (order) => {
    const s = order?.status || "pending";
    if (s === "accepted") return order?.acceptedBy ? `PRANUAR nga ${order.acceptedBy}` : "PRANUAR";
    if (s === "done") return "DËRGUAR";
    return "PENDING";
  };

  const openDetails = (id) => {
    if (!id) return;
    // ✅ kjo duhet të përputhet me route në App.jsx
    navigate(`/manager/order/${id}`);
  };

  return (
    <div className="orders-page">
      <h1 className="orders-title">🛒 Porositë</h1>

      {/* FILTER BUTTONS */}
      <div className="orders-location-row">
        <button
          className={`filter-pill ${sourceFilter === "all" ? "active" : ""}`}
          onClick={() => setSourceFilter("all")}
        >
          Të gjitha
        </button>
        <button
          className={`filter-pill ${sourceFilter === "tavoline" ? "active" : ""}`}
          onClick={() => setSourceFilter("tavoline")}
        >
          Tavolina
        </button>
        <button
          className={`filter-pill ${sourceFilter === "dhoma" ? "active" : ""}`}
          onClick={() => setSourceFilter("dhoma")}
        >
          Dhoma
        </button>
        <button
          className={`filter-pill ${sourceFilter === "cadra" ? "active" : ""}`}
          onClick={() => setSourceFilter("cadra")}
        >
          Çadra
        </button>
      </div>

      {/* REFRESH */}
      <div className="orders-refresh-wrapper">
        <button className="orders-refresh-btn" onClick={loadOrders}>
          Rifresko
        </button>
      </div>

      {/* ERROR */}
      {errMsg ? <p className="orders-empty">❌ {errMsg}</p> : null}

      {/* LISTA */}
      {loading ? (
        <p className="orders-empty">Duke ngarkuar...</p>
      ) : orders.length === 0 ? (
        <p className="orders-empty">Nuk ka porosi për këtë seksion.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const time = formatTime(order?.createdAt);
            const statusText = formatStatusText(order);

            return (
              <div
                key={order?._id || Math.random()}
                className="order-row"
                onClick={() => openDetails(order?._id)}
              >
                <div className="order-left">
                  <div className="order-line-top">
                    <span className="order-table">
                      {String(order?.sourceType || "tavoline").toUpperCase()}{" "}
                      {order?.sourceNumber || "-"}
                    </span>

                    <span className="order-created">
                      Krijuar nga: <b>{order?.createdBy || "-"}</b>
                      {time !== "-" ? <> · Ora: {time}</> : null}
                    </span>
                  </div>

                  <div className="order-items">
                    {(order?.items || []).map((it, idx) => (
                      <div key={idx} className="order-item-line">
                        {Number(it?.qty) || 1}x {it?.name || "Produkt"}{" "}
                        {typeof it?.price === "number" ? (
                          <span>({it.price.toFixed(2)} €)</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="order-right">
                  <div className="order-total">
                    Total: <b>{(Number(order?.total) || 0).toFixed(2)} €</b>
                  </div>

                  <div className={`order-status-pill status-${order?.status || "pending"}`}>
                    {statusText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
