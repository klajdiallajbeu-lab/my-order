// src/pages/manager/XhiroPage.jsx
import "./XhiroPage.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPeriodStats, getWaiterStats } from "../../api/statsApi.js";

const DASHBOARD_FROM_KEY = "dashboard_from_date";
const DASHBOARD_TO_KEY = "dashboard_to_date";

const getToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const toDateOnly = (date) => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Grupim: Dhoma & Çadra (opsional – nëse i ke në emra)
const groupRoomsAndUmbrellas = (rows) => {
  if (!Array.isArray(rows)) return [];

  const map = new Map();

  for (const w of rows) {
    let key = (w.waiterName || "Pa emër").trim();

    if (/dhoma/i.test(key)) key = "Dhoma";
    if (/çadra/i.test(key) || /cadra/i.test(key)) key = "Çadra";

    if (!map.has(key)) {
      map.set(key, { waiterName: key, orderCount: 0, totalRevenue: 0 });
    }

    const cur = map.get(key);
    cur.orderCount += Number(w.orderCount || 0);
    cur.totalRevenue += Number(w.totalRevenue || 0);
  }

  // rendit sipas xhiros (zbritëse)
  return Array.from(map.values()).sort(
    (a, b) => (Number(b.totalRevenue) || 0) - (Number(a.totalRevenue) || 0)
  );
};

export default function XhiroPage() {
  const navigate = useNavigate();

  const [fromDate] = useState(() => {
    const saved = localStorage.getItem(DASHBOARD_FROM_KEY);
    return saved ? new Date(saved) : getToday();
  });

  const [toDate] = useState(() => {
    const saved = localStorage.getItem(DASHBOARD_TO_KEY);
    return saved ? new Date(saved) : getToday();
  });

  const from = useMemo(() => toDateOnly(fromDate), [fromDate]);
  const to = useMemo(() => toDateOnly(toDate), [toDate]);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [waiterStats, setWaiterStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErrMsg("");

        // ✅ KËTU: statsApi kthen data direkt
        const periodData = await getPeriodStats(from, to);
        setTotalRevenue(Number(periodData?.totalRevenue || 0));

        const waitersRaw = await getWaiterStats(from, to); // duhet të jetë array
        const grouped = groupRoomsAndUmbrellas(waitersRaw || []);
        setWaiterStats(grouped);
      } catch (err) {
        console.error("❌ Gabim te XhiroPage:", err);
        setTotalRevenue(0);
        setWaiterStats([]);
        setErrMsg(err?.message || "❌ Gabim gjatë marrjes së statistikave.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [from, to]);

  return (
    <div className="xhiro-page">
      <div className="xhiro-header">
        <button className="back-btn" onClick={() => navigate("/manager/dashboard")}>
          ← Kthehu te Dashboard
        </button>

        <h1>💰 Xhiro periudhës</h1>

        <p className="xhiro-period">
          Periudha: <b>{fromDate.toLocaleDateString("sq-AL")}</b> –{" "}
          <b>{toDate.toLocaleDateString("sq-AL")}</b>
        </p>
      </div>

      {errMsg && <div className="xhiro-error">{errMsg}</div>}

      {/* Totali */}
      <div className="xhiro-summary">
        <div className="xhiro-card xhiro-card-wide">
          <h3>Totali i xhiros</h3>
          <p className="value">
            {loading ? "..." : `${totalRevenue.toLocaleString("sq-AL")} €`}
          </p>
        </div>
      </div>

      {/* Waiters table */}
      <div className="xhiro-waiters">
        {loading ? (
          <p className="empty-text">Duke ngarkuar...</p>
        ) : waiterStats.length === 0 ? (
          <p className="empty-text">Nuk ka të dhëna për këtë periudhë.</p>
        ) : (
          <div className="waiter-list">
            <div className="waiter-row waiter-header-row">
              <span>Kamarieri</span>
              <span>Porosi</span>
              <span>Xhiro</span>
            </div>

            {waiterStats.map((w) => (
              <div className="waiter-row" key={w.waiterName}>
                <span>{w.waiterName}</span>
                <span>{Number(w.orderCount || 0)}</span>
                <span>{(Number(w.totalRevenue) || 0).toFixed(2)} €</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
