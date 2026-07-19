import "../../qz-signing";
// src/pages/manager/XhiroPage.jsx
import "./XhiroPage.css";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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

const diffDaysInclusive = (fromDate, toDate) => {
  const start = startOfDay(fromDate);
  const end = startOfDay(toDate);
  const diff = Math.round((end - start) / 86400000);
  return Math.max(1, diff + 1);
};

const getPreviousRange = (fromDate, toDate) => {
  const days = diffDaysInclusive(fromDate, toDate);
  const prevTo = new Date(fromDate);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: prevFrom, to: prevTo };
};

const getPercentChange = (current, previous) => {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0 && cur === 0) return 0;
  if (prev === 0) return 100;
  return ((cur - prev) / prev) * 100;
};

const PALETTE = ["#2563eb", "#60a5fa", "#93c5fd", "#1d4ed8", "#3b82f6", "#0ea5e9"];

const normalizeWaiterStats = (raw) => {
  const empty = {
    waiterRows: [],
    roomRow: { waiterName: "Dhoma", orderCount: 0, totalRevenue: 0, type: "dhoma" },
    umbrellaRow: { waiterName: "Cadra", orderCount: 0, totalRevenue: 0, type: "cadra" },
  };

  if (!raw) return empty;

  if (!Array.isArray(raw) && typeof raw === "object") {
    const waitersArr = Array.isArray(raw.waiters) ? raw.waiters : [];
    return {
      waiterRows: waitersArr.map((w) => ({
        waiterName: w.waiterName ?? w.name ?? w.createdBy ?? "Pa emër",
        orderCount: Number(w.orderCount ?? w.orders ?? w.totalOrders ?? w.count ?? 0),
        totalRevenue: Number(w.totalRevenue ?? w.revenue ?? w.total ?? 0),
        type: "waiter",
      })),
      roomRow: {
        waiterName: "Dhoma",
        orderCount: Number(raw.rooms?.orderCount || 0),
        totalRevenue: Number(raw.rooms?.totalRevenue || 0),
        type: "dhoma",
      },
      umbrellaRow: {
        waiterName: "Cadra",
        orderCount: Number(raw.umbrellas?.orderCount || 0),
        totalRevenue: Number(raw.umbrellas?.totalRevenue || 0),
        type: "cadra",
      },
    };
  }

  if (Array.isArray(raw)) {
    const map = new Map();
    for (const w of raw) {
      let key = (w.waiterName || w.name || "Pa emër").trim();
      let type = "waiter";
      if (/dhoma/i.test(key)) { key = "Dhoma"; type = "dhoma"; }
      if (/çadra/i.test(key) || /cadra/i.test(key)) { key = "Cadra"; type = "cadra"; }

      if (!map.has(key)) map.set(key, { waiterName: key, orderCount: 0, totalRevenue: 0, type });
      const cur = map.get(key);
      cur.orderCount += Number(w.orderCount || 0);
      cur.totalRevenue += Number(w.totalRevenue || 0);
    }

    const rows = Array.from(map.values());
    return {
      waiterRows: rows.filter((r) => r.type === "waiter"),
      roomRow: rows.find((r) => r.type === "dhoma") || empty.roomRow,
      umbrellaRow: rows.find((r) => r.type === "cadra") || empty.umbrellaRow,
    };
  }

  return empty;
};

export default function XhiroPage() {
  const businessName = localStorage.getItem("hotelName") || "Biznesi";
  const userName =
    sessionStorage.getItem("userName") || localStorage.getItem("userName") || "User";

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
  const [roomRow, setRoomRow] = useState({ waiterName: "Dhoma", orderCount: 0, totalRevenue: 0, type: "dhoma" });
  const [umbrellaRow, setUmbrellaRow] = useState({ waiterName: "Cadra", orderCount: 0, totalRevenue: 0, type: "cadra" });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [periodData, previousPeriodData, waiterStatsRaw] = await Promise.all([
          getPeriodStats(from, to),
          getPeriodStats(previousFrom, previousTo),
          getWaiterStats(from, to),
        ]);

        setTotalRevenue(Number(periodData?.totalRevenue || 0));
        setPreviousRevenue(Number(previousPeriodData?.totalRevenue || 0));
        setPeriodOrders(Number(periodData?.countOrders || periodData?.orderCount || 0));

        const byDay = Array.isArray(periodData?.byDay) ? periodData.byDay : [];
        setDailySales(byDay.map((d) => ({ date: d.date, revenue: Number(d.total ?? d.revenue ?? 0) })));

        const normalized = normalizeWaiterStats(waiterStatsRaw);
        const sortedWaiters = [...normalized.waiterRows].sort(
          (a, b) => (Number(b.totalRevenue) || 0) - (Number(a.totalRevenue) || 0)
        );

        setWaiterRows(sortedWaiters);
        setRoomRow(normalized.roomRow);
        setUmbrellaRow(normalized.umbrellaRow);
      } catch (err) {
        console.error("Gabim te XhiroPage:", err);
        setTotalRevenue(0);
        setPreviousRevenue(0);
        setPeriodOrders(0);
        setDailySales([]);
        setWaiterRows([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [from, to, previousFrom, previousTo]);

  const daysCount = useMemo(() => diffDaysInclusive(fromDate, toDate), [fromDate, toDate]);
  const averagePerDay = useMemo(() => (daysCount > 0 ? totalRevenue / daysCount : 0), [totalRevenue, daysCount]);
  const percentChange = useMemo(() => getPercentChange(totalRevenue, previousRevenue), [totalRevenue, previousRevenue]);

  const percentLabel = useMemo(() => {
    if (totalRevenue === 0 && previousRevenue === 0) return "Pa ndryshim";
    if (previousRevenue === 0 && totalRevenue > 0) return "Rritje";
    const sign = percentChange > 0 ? "+" : "";
    return `${sign}${percentChange.toFixed(1)}%`;
  }, [percentChange, totalRevenue, previousRevenue]);

  const isUp = percentChange >= 0;

  const chartData = useMemo(() => {
    return dailySales.map((d) => {
      const dateObj = new Date(`${d.date}T00:00:00`);
      return {
        label: dateObj.toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit" }),
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

  const pieData = useMemo(
    () => breakdownRows.map((r, i) => ({ name: r.label, value: r.totalRevenue, color: PALETTE[i % PALETTE.length] })),
    [breakdownRows]
  );

  const topPerformer = breakdownRows.length > 0 ? breakdownRows[0] : null;
  const topWaiter = waiterRows.length > 0 ? waiterRows[0] : null;

  return (
    <div className="xhiro-page">
      <div className="xhiro-hero">
        <div className="xhiro-hero-left">
          <h1>Raporti i periudhës</h1>
          <p>Pamje e përgjithshme e aktivitetit dhe performancës.</p>

          <div className="xhiro-period-pill">
            <span>{fromDate.toLocaleDateString("sq-AL")}</span>
            <span className="sep">—</span>
            <span>{toDate.toLocaleDateString("sq-AL")}</span>
          </div>
        </div>

        <div className="xhiro-total-card">
          <div>
            <span className="xhiro-total-label">Krahasuar me periudhën e kaluar</span>
            <div className="xhiro-total-value">{loading ? "..." : money(totalRevenue)}</div>
            <div className={`xhiro-total-change ${isUp ? "up" : "down"}`}>
              {isUp ? "↑" : "↓"} {percentLabel}
            </div>
          </div>

          <div className="xhiro-sparkline">
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={70}>
                <LineChart data={chartData}>
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="xhiro-metrics">
        <div className="metric-card">
          <span>Porosi</span>
          <strong>{loading ? "..." : periodOrders.toLocaleString("sq-AL")}</strong>
          <p>Numri total i porosive</p>
        </div>

        <div className="metric-card">
          <span>Mesatarja / ditë</span>
          <strong>{loading ? "..." : money(averagePerDay)}</strong>
          <p>Mesatarja për këtë periudhë</p>
        </div>

        <div className="metric-card">
          <span>Top kontribuesi</span>
          <strong className="truncate">{loading ? "..." : topPerformer?.label || "—"}</strong>
          <p>{topPerformer ? `${money(topPerformer.totalRevenue)} · ${topPerformer.orderCount} porosi` : "Nuk ka të dhëna ende"}</p>
        </div>

        <div className="metric-card">
          <span>Kamarieri më i mirë</span>
          <strong className="truncate">{loading ? "..." : topWaiter?.waiterName || "—"}</strong>
          <p>{topWaiter ? `${money(topWaiter.totalRevenue)} · ${topWaiter.orderCount} porosi` : "Nuk ka kamarierë me xhiro"}</p>
        </div>
      </div>

      <div className="xhiro-content-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Shitjet ditore</h2>
          </div>

          <div className="panel-body chart-wrap">
            {loading ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : chartData.length === 0 || chartData.every((d) => Number(d.revenue) === 0) ? (
              <div className="empty">Nuk ka shitje për këtë periudhë.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 600 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 600 }} />
                  <Tooltip
                    formatter={(value) => [money(value), "Shitje"]}
                    labelFormatter={(label) => `Data: ${label}`}
                    cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
                    contentStyle={{ borderRadius: "14px", border: "1px solid #ececec", background: "#ffffff", fontSize: 13 }}
                  />
                  <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill="#2563eb" maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Ndarja e xhiros</h2>
          </div>

          <div className="panel-body chart-wrap">
            {loading ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : pieData.length === 0 ? (
              <div className="empty">Nuk ka të dhëna për ndarjen e xhiros.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {pieData.length > 0 && (
            <div className="pie-legend">
              {pieData.map((entry, idx) => (
                <div className="pie-legend-item" key={idx}>
                  <span className="dot" style={{ background: entry.color }} />
                  <span className="pie-legend-name">{entry.name}</span>
                  <span className="pie-legend-value">{money(entry.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel xhiro-wide">
          <div className="panel-head">
            <h2>Performanca e kamarierëve</h2>
          </div>

          <div className="panel-body">
            {loading ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : waiterRows.length === 0 ? (
              <div className="empty">Nuk ka kamarierë me xhiro në këtë periudhë.</div>
            ) : (
              <div className="premium-table">
                <div className="premium-table-head">
                  <span>Kamarieri</span>
                  <span>Porosi</span>
                  <span>Xhiro</span>
                  <span>Mesatarja / Porosi</span>
                </div>

                {waiterRows.map((w, index) => (
                  <div className="premium-table-row" key={w.waiterName}>
                    <div className="table-source">
                      <div className="source-rank">{index + 1}</div>
                      <strong>{w.waiterName}</strong>
                    </div>
                    <span>{Number(w.orderCount || 0).toLocaleString("sq-AL")}</span>
                    <b>{money(w.totalRevenue)}</b>
                    <span>{money(w.orderCount ? w.totalRevenue / w.orderCount : 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}