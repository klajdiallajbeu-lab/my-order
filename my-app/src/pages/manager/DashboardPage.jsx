// src/pages/manager/DashboardPage.jsx
import "./DashboardPage.css";
import { useState, useEffect, useMemo, useCallback } from "react";
import DatePicker from "react-datepicker";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { getTopProducts, getPeriodStats, getWaiterStats } from "../../api/statsApi.js";

const DASHBOARD_FROM_KEY = "dashboard_from_date";
const DASHBOARD_TO_KEY = "dashboard_to_date";

const getToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateParam = (date) => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Paletë ngjyrash (do riciklohet kur të shtohen shumë kamarjerë)
const PALETTE = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7",
  "#06b6d4", "#84cc16", "#f97316", "#14b8a6", "#e11d48",
];

// ngjyrë stabile për çdo emër (që të mos ndryshojë sa herë rifreskon)
const hashColor = (key) => {
  const s = String(key || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const money = (n) => `${(Number(n) || 0).toLocaleString("sq-AL")} €`;

export default function DashboardPage() {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState(() => {
    const saved = localStorage.getItem(DASHBOARD_FROM_KEY);
    return saved ? new Date(saved) : getToday();
  });

  const [toDate, setToDate] = useState(() => {
    const saved = localStorage.getItem(DASHBOARD_TO_KEY);
    return saved ? new Date(saved) : getToday();
  });

  const [confirmedRange, setConfirmedRange] = useState(null);

  // period stats
  const [periodRevenue, setPeriodRevenue] = useState(0);
  const [periodOrders, setPeriodOrders] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [dailySales, setDailySales] = useState([]);

  // top products
  const [topProducts, setTopProducts] = useState([]);
  const [loadingTop, setLoadingTop] = useState(false);

  // report rows (waiter + dhoma + cadra)
  const [reportRows, setReportRows] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const loadPeriodStats = useCallback(async (range) => {
    try {
      setLoadingStats(true);

      const from = formatDateParam(range.from);
      const to = formatDateParam(range.to);

      const data = await getPeriodStats(from, to);

      setPeriodRevenue(Number(data?.totalRevenue || 0));
      setPeriodOrders(Number(data?.countOrders || data?.orderCount || 0));

      const byDay = Array.isArray(data?.byDay) ? data.byDay : [];
      setDailySales(
        byDay.map((d) => ({
          date: d.date,
          revenue: Number(d.total ?? d.revenue ?? 0),
        }))
      );
    } catch (err) {
      console.error("❌ Gabim te getPeriodStats:", err);
      setPeriodRevenue(0);
      setPeriodOrders(0);
      setDailySales([]);
      alert(err?.message || "Nuk u lexuan statistikat nga serveri.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ✅ Këtu lexojmë raportin (kamarjerë + dhoma + cadra)
  const loadReports = useCallback(async (range) => {
    try {
      setLoadingReports(true);
      const from = formatDateParam(range.from);
      const to = formatDateParam(range.to);

      const data = await getWaiterStats(from, to);

      // ✅ backend i ri kthen objekt: { waiters, rooms, umbrellas }
      const waitersArr = Array.isArray(data?.waiters) ? data.waiters : [];
      const rooms = data?.rooms || { label: "Dhoma", orderCount: 0, totalRevenue: 0 };
      const umbrellas = data?.umbrellas || { label: "Cadra", orderCount: 0, totalRevenue: 0 };

      // ✅ 1) waiter rows (vetëm tavoline)
      const waiterRows = waitersArr.map((w) => ({
        type: "waiter",
        name: w.waiterName ?? w.name ?? w.createdBy ?? "Pa emër",
        revenue: Number(w.totalRevenue ?? w.revenue ?? w.total ?? 0),
        // ✅ ky është çelësi i saktë nga backend
        orders: Number(w.orderCount ?? w.orders ?? w.totalOrders ?? w.count ?? 0),
      }));

      // ✅ 2) dhoma + cadra totals (nuk hyjnë te kamarjerët)
      const roomRow = {
        type: "dhoma",
        name: "Dhoma",
        revenue: Number(rooms.totalRevenue || 0),
        orders: Number(rooms.orderCount || 0),
      };

      const cadraRow = {
        type: "cadra",
        name: "Cadra",
        revenue: Number(umbrellas.totalRevenue || 0),
        orders: Number(umbrellas.orderCount || 0),
      };

      // ✅ bashko + filtro rreshta boshe
      const normalized = [...waiterRows, roomRow, cadraRow].filter(
        (r) => (Number(r.revenue) || 0) > 0 || (Number(r.orders) || 0) > 0
      );

      // rendit: kamarjerët sipër, pastaj dhoma, pastaj cadra
      const orderRank = { waiter: 0, dhoma: 1, cadra: 2 };
      normalized.sort((a, b) => {
        const ra = orderRank[a.type] ?? 9;
        const rb = orderRank[b.type] ?? 9;
        if (ra !== rb) return ra - rb;
        return (b.revenue || 0) - (a.revenue || 0);
      });

      setReportRows(normalized);
    } catch (err) {
      console.error("❌ Gabim te getWaiterStats:", err);
      setReportRows([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);


  const handleConfirmDate = async () => {
    if (!fromDate || !toDate) return alert("Zgjidh të dy datat!");
    if (fromDate > toDate) return alert("Data 'Nga' nuk mund të jetë më e madhe se 'Deri'!");

    const range = { from: new Date(fromDate), to: new Date(toDate) };
    setConfirmedRange(range);

    localStorage.setItem(DASHBOARD_FROM_KEY, formatDateParam(range.from));
    localStorage.setItem(DASHBOARD_TO_KEY, formatDateParam(range.to));

    await loadPeriodStats(range);
    await loadReports(range);
  };

  useEffect(() => {
    const initial = { from: new Date(fromDate), to: new Date(toDate) };
    setConfirmedRange(initial);
    loadPeriodStats(initial);
    loadReports(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // chart line
  const chartData = useMemo(() => {
    return dailySales.map((d) => {
      const dateObj = new Date(d.date + "T00:00:00");
      return {
        label: dateObj.toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit" }),
        revenue: Number(d.revenue || 0),
      };
    });
  }, [dailySales]);

  // top products reload on confirmedRange
  useEffect(() => {
    const fetchTop = async () => {
      if (!confirmedRange) return setTopProducts([]);

      try {
        setLoadingTop(true);
        const from = formatDateParam(confirmedRange.from);
        const to = formatDateParam(confirmedRange.to);

        const data = await getTopProducts(from, to, 5);
        setTopProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Gabim te getTopProducts:", err);
        setTopProducts([]);
      } finally {
        setLoadingTop(false);
      }
    };

    fetchTop();
  }, [confirmedRange]);

  // ✅ vetëm kamarjerët (pa dhoma/cadra)
  const waiterOnly = useMemo(() => reportRows.filter((r) => r.type === "waiter"), [reportRows]);
  const dhomaRow = useMemo(() => reportRows.find((r) => r.type === "dhoma"), [reportRows]);
  const cadraRow = useMemo(() => reportRows.find((r) => r.type === "cadra"), [reportRows]);

  const waiterTotalRevenue = useMemo(
    () => waiterOnly.reduce((s, r) => s + (Number(r.revenue) || 0), 0),
    [waiterOnly]
  );
  const waiterTotalOrders = useMemo(
    () => waiterOnly.reduce((s, r) => s + (Number(r.orders) || 0), 0),
    [waiterOnly]
  );

  const donutData = useMemo(() => {
    // rrethi tregon: kamarjerët individualë + Dhoma + Cadra
    return reportRows
      .filter((r) => (Number(r.revenue) || 0) > 0)
      .map((r) => ({
        name: r.name,
        type: r.type,
        value: Number(r.revenue || 0),
        orders: Number(r.orders || 0),
        color: hashColor(`${r.type}:${r.name}`),
      }));
  }, [reportRows]);

  // ✅ label me “shigjetë” si në foto (callout)
  const renderCalloutLabel = (props) => {
    const { cx, cy, midAngle, outerRadius, name, color } = props;

    const RADIAN = Math.PI / 180;
    const r1 = outerRadius + 6;
    const r2 = outerRadius + 18;

    const x1 = cx + r1 * Math.cos(-midAngle * RADIAN);
    const y1 = cy + r1 * Math.sin(-midAngle * RADIAN);
    const x2 = cx + r2 * Math.cos(-midAngle * RADIAN);
    const y2 = cy + r2 * Math.sin(-midAngle * RADIAN);

    const isRight = x2 >= cx;
    const x3 = x2 + (isRight ? 16 : -16);
    const y3 = y2;

    return (
      <g>
        <path d={`M${x1},${y1} L${x2},${y2} L${x3},${y3}`} stroke={color} fill="none" />
        <circle cx={x3} cy={y3} r={2.5} fill={color} />
        <text
          x={x3 + (isRight ? 6 : -6)}
          y={y3}
          textAnchor={isRight ? "start" : "end"}
          dominantBaseline="central"
          style={{ fontSize: 12, fill: "#334155", fontWeight: 600 }}
        >
          {name}
        </text>
      </g>
    );
  };

  return (
    <div className="dash">
      {/* TOP BAR */}
      <div className="dash-topbar" style={{ justifyContent: "flex-end" }}>
        <div className="dash-datebox">
          <div className="dash-date-row">
            <DatePicker
              selected={fromDate}
              onChange={(date) => setFromDate(date)}
              dateFormat="dd/MM/yyyy"
              className="dash-date"
              placeholderText="Nga"
            />
            <DatePicker
              selected={toDate}
              onChange={(date) => setToDate(date)}
              dateFormat="dd/MM/yyyy"
              className="dash-date"
              placeholderText="Deri"
            />
            <button className="dash-confirm" onClick={handleConfirmDate} title="Konfirmo">
              ✓
            </button>
          </div>

          {confirmedRange && (
            <div className="dash-period">
              Periudha: <b>{confirmedRange.from.toLocaleDateString("sq-AL")}</b> –{" "}
              <b>{confirmedRange.to.toLocaleDateString("sq-AL")}</b>
            </div>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="dash-kpis">
        <button className="kpi" onClick={() => navigate("/manager/xhiro")}>
          <div className="kpi-head">
            <span className="kpi-icon">💰</span>
            <span className="kpi-label">Totali</span>
          </div>
          <div className="kpi-value">{loadingStats ? "..." : money(periodRevenue)}</div>
          <div className="kpi-sub">Xhiro periudhe</div>
        </button>

        <button className="kpi" onClick={() => navigate("/manager/orders")}>
          <div className="kpi-head">
            <span className="kpi-icon">🛒</span>
            <span className="kpi-label">Porosi</span>
          </div>
          <div className="kpi-value">
            {loadingStats ? "..." : periodOrders.toLocaleString("sq-AL")}
          </div>
          <div className="kpi-sub">Nr. porosive</div>
        </button>

        <button className="kpi" onClick={() => navigate("/manager/inventari")}>
          <div className="kpi-head">
            <span className="kpi-icon">📦</span>
            <span className="kpi-label">Inventari</span>
          </div>
          <div className="kpi-value">Hap</div>
          <div className="kpi-sub">Kliko për detaje</div>
        </button>
      </div>

      {/* GRID: CHART + TOP PRODUCTS */}
      <div className="dash-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>📈 Shitjet – periudha e zgjedhur</h2>
          </div>

          <div className="panel-body chart-wrap">
            {loadingStats ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : chartData.length === 0 ? (
              <div className="empty">Nuk ka të dhëna për këtë periudhë.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => `${value} €`}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line type="monotone" dataKey="revenue" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>🔥 Top shitjet</h2>
          </div>

          <div className="panel-body">
            {!confirmedRange ? (
              <div className="empty">Zgjidh periudhën sipër dhe shtyp ✓.</div>
            ) : loadingTop ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : topProducts.length === 0 ? (
              <div className="empty">Nuk ka shitje për këtë periudhë.</div>
            ) : (
              <div className="top-list">
                {topProducts.map((p, idx) => (
                  <div className="top-row" key={p.productId || p._id || p.name || idx}>
                    <div className="top-left">
                      <div className="top-rank">{idx + 1}</div>
                      <div className="top-name">{p.name}</div>
                    </div>
                    <div className="top-right">
                      <div className="top-qty">{p.totalQty ?? p.qty ?? 0} shitje</div>
                      <div className="top-rev">
                        {(Number(p.totalRevenue ?? p.revenue) || 0).toFixed(2)} €
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="panel-footer">
              <button className="ghost" onClick={() => navigate("/manager/xhiro")}>
                Shiko xhiron →
              </button>
            </div>
          </div>
        </div>

        {/* PANEL: DONUT + LISTA LEFT */}
        <div className="panel" style={{ gridColumn: "1 / -1" }}>
          <div className="panel-head">
            <h2>👤 Xhiro sipas raportit</h2>
          </div>

          <div className="panel-body report-layout">
            {!confirmedRange ? (
              <div className="empty">Zgjidh periudhën sipër dhe shtyp ✓.</div>
            ) : loadingReports ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : donutData.length === 0 ? (
              <div className="empty">Nuk ka të dhëna në këtë periudhë.</div>
            ) : (
              <>
                {/* LEFT LIST (scroll për 5–10 kamarjerë) */}
                <div className="report-left">
                  <div className="report-left-scroll">
                    {reportRows
                      .filter((r) => (Number(r.revenue) || 0) > 0 || (Number(r.orders) || 0) > 0)
                      .map((r, i) => {
                        const color = hashColor(`${r.type}:${r.name}`);
                        return (
                          <div className="report-card" key={`${r.type}-${r.name}-${i}`}>
                            <div className="dot" style={{ background: color }} />
                            <div className="report-card-main">
                              <div className="report-card-name">{r.name}</div>
                              <div className="report-card-sub">
                                {Number(r.orders || 0).toLocaleString("sq-AL")} porosi
                              </div>
                            </div>
                            <div className="report-card-right">{money(r.revenue)}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* RIGHT DONUT */}
                <div className="report-right">
                  <div className="donut-wrap">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={2}
                          labelLine={false}
                          label={(p) =>
                            renderCalloutLabel({
                              ...p,
                              color: p.payload?.color || hashColor(`${p.payload?.type}:${p.name}`),
                            })
                          }
                          isAnimationActive={true}
                          animationDuration={900}
                        >
                          {donutData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>

                        {/* teksti në mes (Total + porosi) */}
                        <text
                          x="50%"
                          y="48%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: 20, fontWeight: 800, fill: "#0f172a" }}
                        >
                          {money(donutData.reduce((s, r) => s + (Number(r.value) || 0), 0))}
                        </text>
                        <text
                          x="50%"
                          y="58%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: 12, fontWeight: 600, fill: "#64748b" }}
                        >
                          {donutData
                            .reduce((s, r) => s + (Number(r.orders) || 0), 0)
                            .toLocaleString("sq-AL")}{" "}
                          porosi
                        </text>

                        <Tooltip
                          formatter={(v, _n, p) => {
                            const orders = p?.payload?.orders ?? 0;
                            return [`${Number(v || 0).toFixed(2)} €`, `(${orders} porosi)`];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* mini info */}
                  <div className="report-mini">
                    <div className="mini-row">
                      <span className="mini-label">Kamarjerë:</span>
                      <b>{money(waiterTotalRevenue)}</b>
                      <span className="mini-muted">({waiterTotalOrders} porosi)</span>
                    </div>

                    <div className="mini-row">
                      <span className="mini-label">Dhoma:</span>
                      <b>{money(dhomaRow?.revenue || 0)}</b>
                      <span className="mini-muted">
                        ({Number(dhomaRow?.orders || 0)} porosi)
                      </span>
                    </div>

                    <div className="mini-row">
                      <span className="mini-label">Cadra:</span>
                      <b>{money(cadraRow?.revenue || 0)}</b>
                      <span className="mini-muted">
                        ({Number(cadraRow?.orders || 0)} porosi)
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
