import "./DashboardPage.css";
import { useState, useEffect, useMemo, useCallback, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  ReceiptText,
  PackageCheck,
  ChartPie,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  getTopProducts,
  getPeriodStats,
  getWaiterStats,
} from "../../api/statsApi.js";

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

const PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#f97316",
  "#e11d48",
];

const hashColor = (key) => {
  const s = String(key || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const money = (n) => `${(Number(n) || 0).toLocaleString("sq-AL")} ALL`;

const RangeInput = forwardRef(({ value, onClick }, ref) => (
  <button
    type="button"
    className="dash-date-range-btn"
    onClick={onClick}
    ref={ref}
  >
    <span>{value || "Zgjidh periudhën"}</span>
  </button>
));

export default function DashboardPage() {
  const navigate = useNavigate();

  const userName =
    sessionStorage.getItem("userName") ||
    sessionStorage.getItem("waiterName") ||
    "User";

  const hour = new Date().getHours();
  let greeting = "Welcome";

  if (hour < 12) greeting = "Mirëmëngjesi";
  else if (hour < 18) greeting = "Mirëdita";
  else greeting = "Mirëmbrëma";

  const [fromDate, setFromDate] = useState(() => {
    const saved = localStorage.getItem(DASHBOARD_FROM_KEY);
    return saved ? new Date(saved) : getToday();
  });

  const [toDate, setToDate] = useState(() => {
    const saved = localStorage.getItem(DASHBOARD_TO_KEY);
    return saved ? new Date(saved) : getToday();
  });

  const [confirmedRange, setConfirmedRange] = useState(null);

  const [periodRevenue, setPeriodRevenue] = useState(0);
  const [periodOrders, setPeriodOrders] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [dailySales, setDailySales] = useState([]);

  const [topProducts, setTopProducts] = useState([]);
  const [loadingTop, setLoadingTop] = useState(false);

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
      console.error("Gabim te getPeriodStats:", err);
      setPeriodRevenue(0);
      setPeriodOrders(0);
      setDailySales([]);
      alert(err?.message || "Nuk u lexuan statistikat nga serveri.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadReports = useCallback(async (range) => {
    try {
      setLoadingReports(true);

      const from = formatDateParam(range.from);
      const to = formatDateParam(range.to);

      const data = await getWaiterStats(from, to);

      const waitersArr = Array.isArray(data?.waiters) ? data.waiters : [];
      const rooms = data?.rooms || {
        label: "Dhoma",
        orderCount: 0,
        totalRevenue: 0,
      };
      const umbrellas = data?.umbrellas || {
        label: "Cadra",
        orderCount: 0,
        totalRevenue: 0,
      };

      const waiterRows = waitersArr.map((w) => ({
        type: "waiter",
        name: w.waiterName ?? w.name ?? w.createdBy ?? "Pa emër",
        revenue: Number(w.totalRevenue ?? w.revenue ?? w.total ?? 0),
        orders: Number(w.orderCount ?? w.orders ?? w.totalOrders ?? w.count ?? 0),
      }));

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

      const normalized = [...waiterRows, roomRow, cadraRow].filter(
        (r) => (Number(r.revenue) || 0) > 0 || (Number(r.orders) || 0) > 0
      );

      const orderRank = { waiter: 0, dhoma: 1, cadra: 2 };
      normalized.sort((a, b) => {
        const ra = orderRank[a.type] ?? 9;
        const rb = orderRank[b.type] ?? 9;
        if (ra !== rb) return ra - rb;
        return (b.revenue || 0) - (a.revenue || 0);
      });

      setReportRows(normalized);
    } catch (err) {
      console.error("Gabim te getWaiterStats:", err);
      setReportRows([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const handleConfirmDate = async () => {
    if (!fromDate || !toDate) return alert("Zgjidh të dy datat!");

    if (fromDate > toDate) {
      return alert("Data 'Nga' nuk mund të jetë më e madhe se 'Deri'!");
    }

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
  }, []);

  const chartData = useMemo(() => {
    return dailySales.map((d) => {
      const dateObj = new Date(d.date + "T00:00:00");
      return {
        label: dateObj.toLocaleDateString("sq-AL", {
          day: "2-digit",
          month: "2-digit",
        }),
        revenue: Number(d.revenue || 0),
      };
    });
  }, [dailySales]);

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
        console.error("Gabim te getTopProducts:", err);
        setTopProducts([]);
      } finally {
        setLoadingTop(false);
      }
    };

    fetchTop();
  }, [confirmedRange]);

  const waiterOnly = useMemo(
    () => reportRows.filter((r) => r.type === "waiter"),
    [reportRows]
  );

  const dhomaRow = useMemo(
    () => reportRows.find((r) => r.type === "dhoma"),
    [reportRows]
  );

  const cadraRow = useMemo(
    () => reportRows.find((r) => r.type === "cadra"),
    [reportRows]
  );

  const waiterTotalRevenue = useMemo(
    () => waiterOnly.reduce((s, r) => s + (Number(r.revenue) || 0), 0),
    [waiterOnly]
  );

  const waiterTotalOrders = useMemo(
    () => waiterOnly.reduce((s, r) => s + (Number(r.orders) || 0), 0),
    [waiterOnly]
  );

  const donutData = useMemo(() => {
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

  const totalReportRevenue = useMemo(
    () => donutData.reduce((s, r) => s + (Number(r.value) || 0), 0),
    [donutData]
  );

  const totalReportOrders = useMemo(
    () => donutData.reduce((s, r) => s + (Number(r.orders) || 0), 0),
    [donutData]
  );

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
        <path
          d={`M${x1},${y1} L${x2},${y2} L${x3},${y3}`}
          stroke={color}
          fill="none"
        />
        <circle cx={x3} cy={y3} r={2.5} fill={color} />
        <text
          x={x3 + (isRight ? 6 : -6)}
          y={y3}
          textAnchor={isRight ? "start" : "end"}
          dominantBaseline="central"
          style={{ fontSize: 12, fill: "#334155", fontWeight: 700 }}
        >
          {name}
        </text>
      </g>
    );
  };

  return (
    <div className="dash">
      <div className="dash-hero">
        <div className="dash-hero-left">
          <span className="dash-eyebrow">Manager Dashboard</span>

          <h1>
            {greeting}, <span>{userName}</span>
          </h1>

          <p>
            Përmbledhje e shpejtë e shitjeve, faturave, produkteve më të shitura
            dhe raportit sipas kamarierëve, dhomave dhe çadrave.
          </p>

          <div className="dash-hero-pills">
            <div className="dash-pill">
              <b>{loadingStats ? "..." : periodOrders.toLocaleString("sq-AL")}</b>
              <span>porosi</span>
            </div>

            <div className="dash-pill">
              <b>{loadingStats ? "..." : money(periodRevenue)}</b>
              <span>xhiro</span>
            </div>
          </div>
        </div>

        <div className="dash-filter-card">
          <div className="dash-filter-top">
            <div>
              <h3>Filtro periudhën</h3>
              <p>Zgjidh datat për raportin</p>
            </div>
            <span className="dash-filter-badge">Live</span>
          </div>

          <div className="dash-date-row dash-date-row-range">
            <DatePicker
              selected={fromDate}
              onChange={(dates) => {
                const [start, end] = dates;
                setFromDate(start);
                setToDate(end);
              }}
              startDate={fromDate}
              endDate={toDate}
              selectsRange
              dateFormat="dd/MM/yyyy"
              maxDate={new Date()}
              monthsShown={1}
              shouldCloseOnSelect={false}
              isClearable={false}
              calendarClassName="dash-calendar"
              popperClassName="dash-popper"
              customInput={<RangeInput />}
            />

            <button
              type="button"
              className="dash-confirm"
              onClick={handleConfirmDate}
              aria-label="Konfirmo periudhën"
            >
              OK
            </button>
          </div>

          <div className="dash-active-range">
            {fromDate && toDate
              ? `${formatDateParam(fromDate)} / ${formatDateParam(toDate)}`
              : "Asnjë periudhë e zgjedhur"}
          </div>
        </div>
      </div>

      <div className="dash-kpis">
        <button className="kpi kpi-finance" onClick={() => navigate("/manager/xhiro")}>
          <div className="kpi-icon"><Wallet size={24} /></div>

          <div className="kpi-content">
            <div className="kpi-head">
              <span className="kpi-label">Financat</span>
              <span className="kpi-badge blue">Totali</span>
            </div>

            <div className="kpi-value">
              {loadingStats ? "..." : money(periodRevenue)}
            </div>

            <div className="kpi-sub">Raporti total për periudhën</div>
          </div>
        </button>

        <button className="kpi kpi-orders" onClick={() => navigate("/manager/orders")}>
          <div className="kpi-icon"><ReceiptText size={24} /></div>

          <div className="kpi-content">
            <div className="kpi-head">
              <span className="kpi-label">Faturat</span>
              <span className="kpi-badge purple">Porosi</span>
            </div>

            <div className="kpi-value">
              {loadingStats ? "..." : periodOrders.toLocaleString("sq-AL")}
            </div>

            <div className="kpi-sub">Numri total i porosive</div>
          </div>
        </button>

        <button className="kpi kpi-stock" onClick={() => navigate("/manager/inventari")}>
          <div className="kpi-icon"><PackageCheck size={24} /></div>

          <div className="kpi-content">
            <div className="kpi-head">
              <span className="kpi-label">Inventari</span>
              <span className="kpi-badge cyan">Menaxho</span>
            </div>

            <div className="kpi-value kpi-text-value">Inventari</div>
            <div className="kpi-sub">Kontrollo gjendjen e produkteve</div>
          </div>
        </button>

        <button
          className="kpi kpi-report"
          onClick={() =>
            document
              .getElementById("dash-report-panel")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <div className="kpi-icon"><ChartPie size={24} /></div>

          <div className="kpi-content">
            <div className="kpi-head">
              <span className="kpi-label">Raporti</span>
              <span className="kpi-badge orange">Analizë</span>
            </div>

            <div className="kpi-value kpi-text-value">Detaje</div>
            <div className="kpi-sub">Shiko ndarjen sipas burimeve</div>
          </div>
        </button>
      </div>

      <div className="dash-grid">
        <div className="panel panel-sales">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Grafiku</span>
              <h2>Shitjet për periudhën</h2>
            </div>
          </div>

          <div className="panel-body chart-wrap">
            {loadingStats ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : chartData.length === 0 ? (
              <div className="empty">Nuk ka të dhëna për këtë periudhë.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe7f5" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value || 0).toFixed(2)} ALL`, "Shitje"]}
                    labelFormatter={(label) => `Data: ${label}`}
                    cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
                    contentStyle={{
                      borderRadius: "18px",
                      border: "1px solid #dbeafe",
                      boxShadow: "0 18px 38px rgba(15, 23, 42, 0.12)",
                      background: "#ffffff",
                    }}
                  />
                  <Bar dataKey="revenue" radius={[14, 14, 0, 0]} fill="#2563eb" maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="panel panel-top-products">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">Produktet</span>
              <h2>Top shitjet</h2>
            </div>
          </div>

          <div className="panel-body">
            {!confirmedRange ? (
              <div className="empty">Zgjidh periudhën sipër dhe shtyp OK.</div>
            ) : loadingTop ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : topProducts.length === 0 ? (
              <div className="empty">Nuk ka shitje për këtë periudhë.</div>
            ) : (
              <div className="top-list">
                {topProducts.map((p, idx) => (
                  <div className="modern-top-row" key={p.productId || p._id || p.name || idx}>
                    <div className="top-left">
                      <div className="top-rank">{idx + 1}</div>

                      <div className="top-info">
                        <div className="top-name">{p.name}</div>
                        <div className="top-meta">{p.totalQty ?? p.qty ?? 0} shitje</div>
                      </div>
                    </div>

                    <div className="top-right">
                      <div className="top-rev">
                        {(Number(p.totalRevenue ?? p.revenue) || 0).toFixed(2)} ALL
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="panel panel-report" id="dash-report-panel">
          <div className="panel-head report-title-row">
            <div>
              <span className="panel-kicker">Analizë</span>
              <h2>Raporti i periudhës</h2>
            </div>

            <div className="report-total-chip">
              <span>Total</span>
              <b>{money(totalReportRevenue)}</b>
            </div>
          </div>

          <div className="panel-body report-layout">
            {!confirmedRange ? (
              <div className="empty">Zgjidh periudhën sipër dhe shtyp OK.</div>
            ) : loadingReports ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : donutData.length === 0 ? (
              <div className="empty">Nuk ka të dhëna në këtë periudhë.</div>
            ) : (
              <>
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

                <div className="report-right">
                  <div className="donut-wrap">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={85}
                          outerRadius={125}
                          paddingAngle={2}
                          labelLine={false}
                          label={(p) =>
                            renderCalloutLabel({
                              ...p,
                              color: p.payload?.color || hashColor(`${p.payload?.type}:${p.name}`),
                            })
                          }
                          isAnimationActive
                          animationDuration={900}
                        >
                          {donutData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>

                        <text
                          x="50%"
                          y="48%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: 22, fontWeight: 900, fill: "#0f172a" }}
                        >
                          {money(totalReportRevenue)}
                        </text>

                        <text
                          x="50%"
                          y="58%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }}
                        >
                          {totalReportOrders.toLocaleString("sq-AL")} porosi
                        </text>

                        <Tooltip
                          formatter={(v, _n, p) => {
                            const orders = p?.payload?.orders ?? 0;
                            return [`${Number(v || 0).toFixed(2)} ALL`, `(${orders} porosi)`];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="report-mini">
                    <div className="mini-row">
                      <span className="mini-label">Kamarjerë</span>
                      <b>{money(waiterTotalRevenue)}</b>
                      <span className="mini-muted">({waiterTotalOrders} porosi)</span>
                    </div>

                    <div className="mini-row">
                      <span className="mini-label">Dhoma</span>
                      <b>{money(dhomaRow?.revenue || 0)}</b>
                      <span className="mini-muted">
                        ({Number(dhomaRow?.orders || 0)} porosi)
                      </span>
                    </div>

                    <div className="mini-row">
                      <span className="mini-label">Cadra</span>
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