import "../../qz-signing";
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
  ChevronDown,
  LayoutGrid,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getTopProducts, getPeriodStats } from "../../api/statsApi.js";

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

const money = (n) => `${(Number(n) || 0).toLocaleString("sq-AL")} ALL`;

const RangeInput = forwardRef(({ value, onClick }, ref) => (
  <button type="button" className="dash-date-range-btn" onClick={onClick} ref={ref}>
    <span>{value || "Zgjidh periudhën"}</span>
  </button>
));

export default function DashboardPage() {
  const navigate = useNavigate();

  const userName =
    sessionStorage.getItem("userName") ||
    localStorage.getItem("userName") ||
    sessionStorage.getItem("managerName") ||
    localStorage.getItem("managerName") ||
    sessionStorage.getItem("name") ||
    localStorage.getItem("name") ||
    "User";

  const businessName = localStorage.getItem("hotelName") || "Biznesi";

  const hour = new Date().getHours();
  let greeting = "Mirëdita";
  if (hour < 12) greeting = "Mirëmëngjesi";
  else if (hour >= 18) greeting = "Mirëmbrëma";

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
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const handleConfirmDate = async () => {
    if (!fromDate || !toDate) return;
    if (fromDate > toDate) return;

    const range = { from: new Date(fromDate), to: new Date(toDate) };
    setConfirmedRange(range);

    localStorage.setItem(DASHBOARD_FROM_KEY, formatDateParam(range.from));
    localStorage.setItem(DASHBOARD_TO_KEY, formatDateParam(range.to));

    await loadPeriodStats(range);
  };

  useEffect(() => {
    const initial = { from: new Date(fromDate), to: new Date(toDate) };
    setConfirmedRange(initial);
    loadPeriodStats(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = useMemo(() => {
    return dailySales.map((d) => {
      const dateObj = new Date(d.date + "T00:00:00");
      return {
        label: dateObj.toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit" }),
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

  return (
    <div className="dash">
      <div className="dash-topbar">
        <div className="dash-topbar-left">
          <h1>
            {greeting}, <span>{userName}</span>
          </h1>
        </div>

        <div className="dash-topbar-right">
          <div className="dash-date-row-range">
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

            <button type="button" className="dash-confirm" onClick={handleConfirmDate}>
              OK
            </button>
          </div>

          <div className="dash-business-pill">
            <LayoutGrid size={15} />
            <span>{businessName}</span>
            <ChevronDown size={14} />
          </div>

          <div className="dash-avatar">{userName.charAt(0).toUpperCase()}</div>
        </div>
      </div>

      <div className="dash-kpis">
        <button className="kpi" onClick={() => navigate("/manager/xhiro")}>
          <div className="kpi-icon"><Wallet size={20} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Financat</span>
            <div className="kpi-value">{loadingStats ? "..." : money(periodRevenue)}</div>
            <div className="kpi-sub">Raporti total për periudhën</div>
          </div>
        </button>

        <button className="kpi" onClick={() => navigate("/manager/orders")}>
          <div className="kpi-icon"><ReceiptText size={20} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Faturat</span>
            <div className="kpi-value">
              {loadingStats ? "..." : periodOrders.toLocaleString("sq-AL")}
            </div>
            <div className="kpi-sub">Numri total i porosive</div>
          </div>
        </button>

        <button className="kpi" onClick={() => navigate("/manager/inventari")}>
          <div className="kpi-icon"><PackageCheck size={20} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Inventari</span>
            <div className="kpi-value kpi-text-value">Inventari</div>
            <div className="kpi-sub">Kontrollo gjendjen e produkteve</div>
          </div>
        </button>

        <button className="kpi" onClick={() => navigate("/manager/xhiro")}>
          <div className="kpi-icon"><ChartPie size={20} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Raporti</span>
            <div className="kpi-value kpi-text-value">Detaje</div>
            <div className="kpi-sub">Pjesë e financave tani</div>
          </div>
        </button>
      </div>

      <div className="dash-grid">
        <div className="panel panel-sales">
          <div className="panel-head">
            <h2>Shitjet për periudhën</h2>
          </div>

          <div className="panel-body chart-wrap">
            {loadingStats ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : chartData.length === 0 ? (
              <div className="empty">
                <ChartPie size={26} strokeWidth={1.5} />
                <span>Nuk ka të dhëna për këtë periudhë.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 600 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 600 }} />
                  <Tooltip
                    formatter={(value) => [`${Number(value || 0).toFixed(2)} ALL`, "Shitje"]}
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

        <div className="panel panel-top-products">
          <div className="panel-head">
            <h2>Top shitjet</h2>
          </div>

          <div className="panel-body">
            {!confirmedRange ? (
              <div className="empty">Zgjidh periudhën sipër dhe shtyp OK.</div>
            ) : loadingTop ? (
              <div className="empty">Duke ngarkuar...</div>
            ) : topProducts.length === 0 ? (
              <div className="empty">
                <PackageCheck size={26} strokeWidth={1.5} />
                <span>Nuk ka shitje për këtë periudhë.</span>
              </div>
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
      </div>
    </div>
  );
}