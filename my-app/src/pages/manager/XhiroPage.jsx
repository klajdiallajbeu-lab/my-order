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
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Crown,
  ReceiptText,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";
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

const normalizeWaiterStats = (raw) => {
  if (!raw) {
    return {
      waiterRows: [],
      roomRow: { waiterName: "Dhoma", orderCount: 0, totalRevenue: 0, type: "dhoma" },
      umbrellaRow: { waiterName: "Cadra", orderCount: 0, totalRevenue: 0, type: "cadra" },
    };
  }

  if (!Array.isArray(raw) && typeof raw === "object") {
    const waitersArr = Array.isArray(raw.waiters) ? raw.waiters : [];

    const waiterRows = waitersArr.map((w) => ({
      waiterName: w.waiterName ?? w.name ?? w.createdBy ?? "Pa emër",
      orderCount: Number(w.orderCount ?? w.orders ?? w.totalOrders ?? w.count ?? 0),
      totalRevenue: Number(w.totalRevenue ?? w.revenue ?? w.total ?? 0),
      type: "waiter",
    }));

    return {
      waiterRows,
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

    return {
      waiterRows: rows.filter((r) => r.type === "waiter"),
      roomRow:
        rows.find((r) => r.type === "dhoma") || {
          waiterName: "Dhoma",
          orderCount: 0,
          totalRevenue: 0,
          type: "dhoma",
        },
      umbrellaRow:
        rows.find((r) => r.type === "cadra") || {
          waiterName: "Cadra",
          orderCount: 0,
          totalRevenue: 0,
          type: "cadra",
        },
    };
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
        console.error("Gabim te XhiroPage:", err);
        setTotalRevenue(0);
        setPreviousRevenue(0);
        setPeriodOrders(0);
        setDailySales([]);
        setWaiterRows([]);
        setRoomRow({ waiterName: "Dhoma", orderCount: 0, totalRevenue: 0, type: "dhoma" });
        setUmbrellaRow({ waiterName: "Cadra", orderCount: 0, totalRevenue: 0, type: "cadra" });
        setErrMsg(err?.message || "Gabim gjatë marrjes së statistikave.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [from, to, previousFrom, previousTo]);

  const daysCount = useMemo(() => diffDaysInclusive(fromDate, toDate), [fromDate, toDate]);
  const averagePerDay = useMemo(
    () => (daysCount > 0 ? totalRevenue / daysCount : 0),
    [totalRevenue, daysCount]
  );

  const percentChange = useMemo(
    () => getPercentChange(totalRevenue, previousRevenue),
    [totalRevenue, previousRevenue]
  );

  const percentLabel = useMemo(() => {
    if (totalRevenue === 0 && previousRevenue === 0) return "Pa ndryshim";
    if (previousRevenue === 0 && totalRevenue > 0) return "Rritje";
    const sign = percentChange > 0 ? "+" : "";
    return `${sign}${percentChange.toFixed(1)}%`;
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

  const topPerformer = useMemo(
    () => (breakdownRows.length > 0 ? breakdownRows[0] : null),
    [breakdownRows]
  );

  const topWaiter = useMemo(
    () => (waiterRows.length > 0 ? waiterRows[0] : null),
    [waiterRows]
  );

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
      <div className="xhiro-topbar">
        <button className="xhiro-back" onClick={() => navigate("/manager/dashboard")}>
          <ArrowLeft size={18} />
          Dashboard
        </button>

        <div className="xhiro-top-actions">
          <button className="xhiro-action ghost" onClick={() => navigate("/manager/orders")}>
            <ReceiptText size={18} />
            Porositë
          </button>

          <button className="xhiro-action solid" onClick={() => navigate("/manager/inventari")}>
            <Boxes size={18} />
            Inventari
          </button>
        </div>
      </div>

      <section className="xhiro-hero">
        <div className="xhiro-hero-left">
          <span className="xhiro-eyebrow">Finance Analytics</span>
          <h1>Raporti i periudhës</h1>
          <p>
            Pamje premium për xhiron, porositë, ecurinë ditore dhe performancën
            sipas kamarierëve, dhomave dhe çadrave.
          </p>

          <div className="xhiro-period-pill">
            Periudha: <b>{fromDate.toLocaleDateString("sq-AL")}</b>
            <span>—</span>
            <b>{toDate.toLocaleDateString("sq-AL")}</b>
          </div>
        </div>

        <div className="xhiro-total-card">
          <div className="xhiro-card-icon">
            <Wallet size={30} />
          </div>

          <div>
            <span className="xhiro-small-label">Totali i xhiros</span>
            <h2>{loading ? "..." : money(totalRevenue)}</h2>
            <p>{loading ? "..." : `${percentLabel} nga periudha e kaluar`}</p>
          </div>
        </div>
      </section>

      {errMsg && <div className="xhiro-error">{errMsg}</div>}

      <section className="xhiro-metrics">
        <div className="metric-card">
          <div className="metric-icon blue">
            <ReceiptText size={22} />
          </div>
          <span>Porosi</span>
          <strong>{loading ? "..." : periodOrders.toLocaleString("sq-AL")}</strong>
          <p>Numri total i porosive</p>
        </div>

        <div className="metric-card">
          <div className="metric-icon cyan">
            <TrendingUp size={22} />
          </div>
          <span>Mesatarja / ditë</span>
          <strong>{loading ? "..." : money(averagePerDay)}</strong>
          <p>Mesatarja për këtë periudhë</p>
        </div>

        <div className="metric-card">
          <div className="metric-icon purple">
            <Crown size={22} />
          </div>
          <span>Top kontribuesi</span>
          <strong>{loading ? "..." : topPerformer?.label || "—"}</strong>
          <p>
            {topPerformer
              ? `${money(topPerformer.totalRevenue)} · ${topPerformer.orderCount} porosi`
              : "Nuk ka të dhëna ende"}
          </p>
        </div>

        <div className="metric-card">
          <div className="metric-icon orange">
            <Trophy size={22} />
          </div>
          <span>Kamarieri më i mirë</span>
          <strong>{loading ? "..." : topWaiter?.waiterName || "—"}</strong>
          <p>
            {topWaiter
              ? `${money(topWaiter.totalRevenue)} · ${topWaiter.orderCount} porosi`
              : "Nuk ka kamarierë me xhiro"}
          </p>
        </div>
      </section>

      <section className="xhiro-content-grid">
        <div className="xhiro-panel chart-panel">
          <div className="xhiro-panel-head">
            <div>
              <span>Grafiku</span>
              <h2>Shitjet ditore</h2>
            </div>
            <BarChart3 size={22} />
          </div>

          <div className="xhiro-panel-body chart-body">
            {loading ? (
              <div className="xhiro-empty-state">
                <h4>Duke ngarkuar...</h4>
              </div>
            ) : chartData.length === 0 || chartData.every((d) => Number(d.revenue) === 0) ? (
              <div className="xhiro-empty-state">
                <h4>Nuk ka shitje për këtë periudhë</h4>
                <p>Provo një periudhë tjetër nga dashboard-i.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={330}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe7f5" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                  />
                  <Tooltip
                    formatter={(value) => [money(value), "Shitje"]}
                    labelFormatter={(label) => `Data: ${label}`}
                    cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #dbeafe",
                      boxShadow: "0 14px 30px rgba(15,23,42,0.10)",
                      background: "#ffffff",
                    }}
                  />
                  <Bar dataKey="revenue" radius={[12, 12, 0, 0]} fill="#2563eb" maxBarSize={46} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="xhiro-panel">
          <div className="xhiro-panel-head">
            <div>
              <span>Breakdown</span>
              <h2>Ndarja e xhiros</h2>
            </div>
            <Wallet size={22} />
          </div>

          <div className="xhiro-panel-body">
            {loading ? (
              <div className="xhiro-empty-state compact">
                <h4>Duke ngarkuar...</h4>
              </div>
            ) : breakdownRows.length === 0 ? (
              <div className="xhiro-empty-state compact">
                <h4>Nuk ka të dhëna</h4>
                <p>Nuk ka kamarierë, dhoma apo cadra me xhiro.</p>
              </div>
            ) : (
              <div className="premium-table">
                <div className="premium-table-head">
                  <span>Burimi</span>
                  <span>Porosi</span>
                  <span>Xhiro</span>
                </div>

                {breakdownRows.map((w, index) => (
                  <div className="premium-table-row" key={`${w.kind}-${w.label}`}>
                    <div className="table-source">
                      <div className="source-rank">{index + 1}</div>
                      <div>
                        <strong>{w.label}</strong>
                        <small>{w.kind}</small>
                      </div>
                    </div>

                    <span>{Number(w.orderCount || 0).toLocaleString("sq-AL")}</span>
                    <b>{money(w.totalRevenue)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="xhiro-panel xhiro-wide">
          <div className="xhiro-panel-head">
            <div>
              <span>Kamarierët</span>
              <h2>Renditja e kamarierëve</h2>
            </div>
            <Trophy size={22} />
          </div>

          <div className="xhiro-panel-body">
            {loading ? (
              <div className="xhiro-empty-state compact">
                <h4>Duke ngarkuar...</h4>
              </div>
            ) : waiterRows.length === 0 ? (
              <div className="xhiro-empty-state compact">
                <h4>Nuk ka kamarierë me xhiro</h4>
                <p>Shitjet mund të jenë nga dhoma ose cadra.</p>
              </div>
            ) : (
              <div className="premium-table">
                <div className="premium-table-head">
                  <span>Kamarieri</span>
                  <span>Porosi</span>
                  <span>Xhiro</span>
                </div>

                {waiterRows.map((w, index) => (
                  <div className="premium-table-row" key={w.waiterName}>
                    <div className="table-source">
                      <div className="source-rank">{index + 1}</div>
                      <div>
                        <strong>{w.waiterName}</strong>
                        <small>Kamarier</small>
                      </div>
                    </div>

                    <span>{Number(w.orderCount || 0).toLocaleString("sq-AL")}</span>
                    <b>{money(w.totalRevenue)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {!loading && !hasData && (
        <div className="xhiro-empty-state bottom-empty">
          <h4>Kjo periudhë nuk ka të dhëna</h4>
          <p>Zgjidh një periudhë tjetër nga dashboard-i për statistika më të plota.</p>
        </div>
      )}
    </div>
  );
}