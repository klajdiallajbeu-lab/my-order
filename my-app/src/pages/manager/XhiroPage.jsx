// src/pages/manager/XhiroPage.jsx
import "./XhiroPage.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
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

const money = (n) => `${(Number(n) || 0).toLocaleString("sq-AL")} ALL`;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const diffDaysInclusive = (fromDate, toDate) => {
  const start = startOfDay(fromDate);
  const end = endOfDay(toDate);
  const diff = Math.round((end - start) / 86400000);
  return Math.max(1, diff + 1);
};

const getPreviousRange = (fromDate, toDate) => {
  const days = diffDaysInclusive(fromDate, toDate);
  const prevTo = new Date(fromDate);
  prevTo.setDate(prevTo.getDate() - 1);

  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));

  return {
    from: prevFrom,
    to: prevTo,
  };
};

const getPercentChange = (current, previous) => {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;

  if (prev === 0 && cur === 0) return 0;
  if (prev === 0) return 100;

  return ((cur - prev) / prev) * 100;
};

const normalizeWaiterStats = (raw) => {
  if (!raw) {
    return {
      waiterRows: [],
      roomRow: { waiterName: "Dhoma", orderCount: 0, totalRevenue: 0 },
      umbrellaRow: { waiterName: "Cadra", orderCount: 0, totalRevenue: 0 },
    };
  }

  // Rasti 1: backend kthen objekt si te DashboardPage
  if (!Array.isArray(raw) && typeof raw === "object") {
    const waitersArr = Array.isArray(raw.waiters) ? raw.waiters : [];

    const waiterRows = waitersArr.map((w) => ({
      waiterName: w.waiterName ?? w.name ?? w.createdBy ?? "Pa emër",
      orderCount: Number(w.orderCount ?? w.orders ?? w.totalOrders ?? w.count ?? 0),
      totalRevenue: Number(w.totalRevenue ?? w.revenue ?? w.total ?? 0),
      type: "waiter",
    }));

    const roomRow = {
      waiterName: "Dhoma",
      orderCount: Number(raw.rooms?.orderCount || 0),
      totalRevenue: Number(raw.rooms?.totalRevenue || 0),
      type: "dhoma",
    };

    const umbrellaRow = {
      waiterName: "Cadra",
      orderCount: Number(raw.umbrellas?.orderCount || 0),
      totalRevenue: Number(raw.umbrellas?.totalRevenue || 0),
      type: "cadra",
    };

    return { waiterRows, roomRow, umbrellaRow };
  }

  // Rasti 2: backend kthen array
  if (Array.isArray(raw)) {
    const map = new Map();

    for (const w of raw) {
      let key = (w.waiterName || w.name || "Pa emër").trim();
      let type = "waiter";

      if (/dhoma/i.test(key)) {
        key = "Dhoma";
        type = "dhoma";
      }

      if (/çadra/i.test(key) || /cadra/i.test(key)) {
        key = "Cadra";
        type = "cadra";
      }

      if (!map.has(key)) {
        map.set(key, {
          waiterName: key,
          orderCount: 0,
          totalRevenue: 0,
          type,
        });
      }

      const cur = map.get(key);
      cur.orderCount += Number(w.orderCount || 0);
      cur.totalRevenue += Number(w.totalRevenue || 0);
    }

    const rows = Array.from(map.values());
    const waiterRows = rows.filter((r) => r.type === "waiter");
    const roomRow =
      rows.find((r) => r.type === "dhoma") || {
        waiterName: "Dhoma",
        orderCount: 0,
        totalRevenue: 0,
        type: "dhoma",
      };

    const umbrellaRow =
      rows.find((r) => r.type === "cadra") || {
        waiterName: "Cadra",
        orderCount: 0,
        totalRevenue: 0,
        type: "cadra",
      };

    return { waiterRows, roomRow, umbrellaRow };
  }

  return {
    waiterRows: [],
    roomRow: { waiterName: "Dhoma", orderCount: 0, totalRevenue: 0, type: "dhoma" },
    umbrellaRow: { waiterName: "Cadra", orderCount: 0, totalRevenue: 0, type: "cadra" },
  };
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

  const previousRange = useMemo(() => getPreviousRange(fromDate, toDate), [fromDate, toDate]);
  const previousFrom = useMemo(() => toDateOnly(previousRange.from), [previousRange]);
  const previousTo = useMemo(() => toDateOnly(previousRange.to), [previousRange]);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [previousRevenue, setPreviousRevenue] = useState(0);
  const [periodOrders, setPeriodOrders] = useState(0);
  const [dailySales, setDailySales] = useState([]);

  const [waiterRows, setWaiterRows] = useState([]);
  const [roomRow, setRoomRow] = useState({
    waiterName: "Dhoma",
    orderCount: 0,
    totalRevenue: 0,
    type: "dhoma",
  });
  const [umbrellaRow, setUmbrellaRow] = useState({
    waiterName: "Cadra",
    orderCount: 0,
    totalRevenue: 0,
    type: "cadra",
  });

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErrMsg("");

        const [periodData, previousPeriodData, waiterStatsRaw] = await Promise.all([
          getPeriodStats(from, to),
          getPeriodStats(previousFrom, previousTo),
          getWaiterStats(from, to),
        ]);

        setTotalRevenue(Number(periodData?.totalRevenue || 0));
        setPreviousRevenue(Number(previousPeriodData?.totalRevenue || 0));
        setPeriodOrders(Number(periodData?.countOrders || periodData?.orderCount || 0));

        const byDay = Array.isArray(periodData?.byDay) ? periodData.byDay : [];
        setDailySales(
          byDay.map((d) => ({
            date: d.date,
            revenue: Number(d.total ?? d.revenue ?? 0),
          }))
        );

        const normalized = normalizeWaiterStats(waiterStatsRaw);
        const sortedWaiters = [...normalized.waiterRows].sort(
          (a, b) => (Number(b.totalRevenue) || 0) - (Number(a.totalRevenue) || 0)
        );

        setWaiterRows(sortedWaiters);
        setRoomRow(normalized.roomRow);
        setUmbrellaRow(normalized.umbrellaRow);
      } catch (err) {
        console.error("❌ Gabim te XhiroPage:", err);
        setTotalRevenue(0);
        setPreviousRevenue(0);
        setPeriodOrders(0);
        setDailySales([]);
        setWaiterRows([]);
        setRoomRow({
          waiterName: "Dhoma",
          orderCount: 0,
          totalRevenue: 0,
          type: "dhoma",
        });
        setUmbrellaRow({
          waiterName: "Cadra",
          orderCount: 0,
          totalRevenue: 0,
          type: "cadra",
        });
        setErrMsg(err?.message || "Gabim gjatë marrjes së statistikave.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [from, to, previousFrom, previousTo]);

  const daysCount = useMemo(() => diffDaysInclusive(fromDate, toDate), [fromDate, toDate]);

  const averagePerDay = useMemo(() => {
    return daysCount > 0 ? totalRevenue / daysCount : 0;
  }, [totalRevenue, daysCount]);

  const percentChange = useMemo(() => {
    return getPercentChange(totalRevenue, previousRevenue);
  }, [totalRevenue, previousRevenue]);

  const percentLabel = useMemo(() => {
    if (totalRevenue === 0 && previousRevenue === 0) return "Pa ndryshim nga periudha e kaluar";
    if (previousRevenue === 0 && totalRevenue > 0) return "Rritje krahasuar me periudhën e kaluar";

    const sign = percentChange > 0 ? "+" : "";
    return `${sign}${percentChange.toFixed(1)}% nga periudha e kaluar`;
  }, [percentChange, totalRevenue, previousRevenue]);

  const chartData = useMemo(() => {
    return dailySales.map((d) => {
      const dateObj = new Date(`${d.date}T00:00:00`);
      return {
        label: dateObj.toLocaleDateString("sq-AL", {
          day: "2-digit",
          month: "2-digit",
        }),
        revenue: Number(d.revenue || 0),
      };
    });
  }, [dailySales]);

  const breakdownRows = useMemo(() => {
    const rows = [
      ...waiterRows.map((w) => ({ ...w, label: w.waiterName, kind: "Kamarier" })),
      { ...roomRow, label: "Dhoma", kind: "Dhoma" },
      { ...umbrellaRow, label: "Cadra", kind: "Cadra" },
    ];

    return rows
      .filter((r) => (Number(r.totalRevenue) || 0) > 0 || (Number(r.orderCount) || 0) > 0)
      .sort((a, b) => (Number(b.totalRevenue) || 0) - (Number(a.totalRevenue) || 0));
  }, [waiterRows, roomRow, umbrellaRow]);

  const topPerformer = useMemo(() => {
    return breakdownRows.length > 0 ? breakdownRows[0] : null;
  }, [breakdownRows]);

  const topWaiter = useMemo(() => {
    return waiterRows.length > 0 ? waiterRows[0] : null;
  }, [waiterRows]);

  const hasData = useMemo(() => {
    return (
      totalRevenue > 0 ||
      periodOrders > 0 ||
      breakdownRows.length > 0 ||
      chartData.some((d) => Number(d.revenue) > 0)
    );
  }, [totalRevenue, periodOrders, breakdownRows, chartData]);

  return (
    <div className="xhiro-page">
      <div className="xhiro-header">

        <div className="xhiro-hero-head">
          <div>
            <h1>Raporti i periudhes</h1>
            <p className="xhiro-period">
              Periudha: <b>{fromDate.toLocaleDateString("sq-AL")}</b> –{" "}
              <b>{toDate.toLocaleDateString("sq-AL")}</b>
            </p>
          </div>

          <div className="xhiro-actions">
            <button className="xhiro-action ghost" onClick={() => navigate("/manager/orders")}>
              Shiko porositë
            </button>
            <button
              className="xhiro-action solid"
              onClick={() => navigate("/manager/inventari")}
            >
              Shko te inventari
            </button>
          </div>
        </div>
      </div>

      {errMsg && <div className="xhiro-error">{errMsg}</div>}

      <div className="xhiro-summary-grid">
        <div className="xhiro-card xhiro-card-hero">
          <div className="xhiro-card-top">
            <span className="xhiro-chip success">Raporti kryesor</span>
            <span
              className={`xhiro-chip ${
                percentChange >= 0 ? "info" : "danger"
              }`}
            >
              {loading ? "..." : percentLabel}
            </span>
          </div>

          <div className="xhiro-hero-main">
            <div>
              <h3>Totali i xhiros</h3>
              <p className="value value-big">
                {loading ? "..." : money(totalRevenue)}
              </p>
            </div>

            <div className="xhiro-hero-side">
              <div className="hero-mini-stat">
                <span>Porosi</span>
                <strong>{loading ? "..." : periodOrders.toLocaleString("sq-AL")}</strong>
              </div>
              <div className="hero-mini-stat">
                <span>Mesatarja / ditë</span>
                <strong>{loading ? "..." : money(averagePerDay)}</strong>
              </div>
              <div className="hero-mini-stat">
                <span>Ditë</span>
                <strong>{daysCount}</strong>
              </div>
              <div className="hero-mini-stat">
                <span>Periudha e kaluar</span>
                <strong>{loading ? "..." : money(previousRevenue)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="xhiro-card">
          <h3>Top kontribuesi</h3>
          {loading ? (
            <p className="value">...</p>
          ) : topPerformer ? (
            <>
              <p className="value">{topPerformer.label}</p>
              <p className="xhiro-muted">
                {money(topPerformer.totalRevenue)} · {topPerformer.orderCount} porosi
              </p>
            </>
          ) : (
            <p className="xhiro-empty-small">Nuk ka të dhëna ende.</p>
          )}
        </div>

        <div className="xhiro-card">
          <h3>Kamarieri më i mirë</h3>
          {loading ? (
            <p className="value">...</p>
          ) : topWaiter ? (
            <>
              <p className="value">{topWaiter.waiterName}</p>
              <p className="xhiro-muted">
                {money(topWaiter.totalRevenue)} · {topWaiter.orderCount} porosi
              </p>
            </>
          ) : (
            <p className="xhiro-empty-small">Nuk ka kamarierë me xhiro.</p>
          )}
        </div>
      </div>

      <div className="xhiro-grid">
        <div className="xhiro-panel">
          <div className="xhiro-panel-head">
            <h2>Grafiku i shitjeve</h2>
            <p>Ecuria ditore për periudhën e zgjedhur</p>
          </div>

          <div className="xhiro-panel-body chart-body">
            {loading ? (
              <div className="xhiro-empty-state">
                <div className="empty-icon">⏳</div>
                <h4>Duke ngarkuar të dhënat...</h4>
              </div>
            ) : chartData.length === 0 || chartData.every((d) => Number(d.revenue) === 0) ? (
              <div className="xhiro-empty-state">
                <div className="empty-icon">📉</div>
                <h4>Nuk ka shitje për këtë periudhë</h4>
                <p>Provo një periudhë tjetër nga dashboard-i për të parë më shumë të dhëna.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe7f5" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [money(value), "Shitje"]}
                    labelFormatter={(label) => `Data: ${label}`}
                    cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #dbeafe",
                      boxShadow: "0 14px 30px rgba(15,23,42,0.10)",
                      background: "#ffffff",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[10, 10, 0, 0]}
                    fill="#3b82f6"
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="xhiro-panel">
          <div className="xhiro-panel-head">
            <h2>Breakdown i xhiros</h2>
            <p>Ndarja sipas burimit të të ardhurave</p>
          </div>

          <div className="xhiro-panel-body">
            {loading ? (
              <div className="xhiro-empty-state compact">
                <div className="empty-icon">⏳</div>
                <h4>Duke ngarkuar...</h4>
              </div>
            ) : breakdownRows.length === 0 ? (
              <div className="xhiro-empty-state compact">
                <div className="empty-icon">📭</div>
                <h4>Nuk ka të dhëna për këtë periudhë</h4>
                <p>Nuk ka kamarierë, dhoma apo cadra me xhiro në këtë interval.</p>
              </div>
            ) : (
              <div className="waiter-list">
                <div className="waiter-row waiter-header-row">
                  <span>Burimi</span>
                  <span>Porosi</span>
                  <span>Xhiro</span>
                </div>

                {breakdownRows.map((w) => (
                  <div className="waiter-row" key={`${w.kind}-${w.label}`}>
                    <span>
                      <strong>{w.label}</strong>
                      <small className="row-kind">{w.kind}</small>
                    </span>
                    <span>{Number(w.orderCount || 0).toLocaleString("sq-AL")}</span>
                    <span>{money(w.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="xhiro-panel xhiro-panel-wide">
          <div className="xhiro-panel-head">
            <h2>Renditja e kamarierëve</h2>
            <p>Kush ka sjellë më shumë xhiro në këtë periudhë</p>
          </div>

          <div className="xhiro-panel-body">
            {loading ? (
              <div className="xhiro-empty-state compact">
                <div className="empty-icon">⏳</div>
                <h4>Duke ngarkuar...</h4>
              </div>
            ) : waiterRows.length === 0 ? (
              <div className="xhiro-empty-state compact">
                <div className="empty-icon">👀</div>
                <h4>Nuk ka kamarierë me xhiro në këtë periudhë</h4>
                <p>Shitjet mund të jenë vetëm nga dhoma ose cadra, ose s’ka porosi fare.</p>
              </div>
            ) : (
              <div className="waiter-list">
                <div className="waiter-row waiter-header-row">
                  <span>Kamarieri</span>
                  <span>Porosi</span>
                  <span>Xhiro</span>
                </div>

                {waiterRows.map((w, index) => (
                  <div className="waiter-row" key={w.waiterName}>
                    <span className="waiter-name-cell">
                      <span className="waiter-rank">{index + 1}</span>
                      <span>{w.waiterName}</span>
                    </span>
                    <span>{Number(w.orderCount || 0).toLocaleString("sq-AL")}</span>
                    <span>{money(w.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!loading && !hasData && (
        <div className="xhiro-empty-state xhiro-bottom-empty">
          <div className="empty-icon">📭</div>
          <h4>Kjo periudhë nuk ka të dhëna</h4>
          <p>Zgjidh një periudhë tjetër nga dashboard-i për të parë statistika më të plota.</p>
        </div>
      )}
    </div>
  );
}