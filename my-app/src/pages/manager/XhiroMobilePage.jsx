import "../../qz-signing";
import { useEffect, useMemo, useState } from "react";
import "./XhiroMobilePage.css";
import { getPeriodStats, getWaiterStats } from "../../api/statsApi.js";
import logo from "../../assets/logo.png";
import {
  Wallet,
  ShoppingBag,
  TrendingUp,
  Trophy,
  UserRound,
} from "lucide-react";


const DASHBOARD_FROM_KEY = "dashboard_from_date";
const DASHBOARD_TO_KEY = "dashboard_to_date";

const getSavedDate = (key) => localStorage.getItem(key) || "";

const formatMoney = (value) => {
  const num = Number(value || 0);
  return `${num.toLocaleString("sq-AL")} ALL`;
};

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

    raw.forEach((w) => {
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
        map.set(key, { waiterName: key, orderCount: 0, totalRevenue: 0, type });
      }

      const cur = map.get(key);
      cur.orderCount += Number(w.orderCount || 0);
      cur.totalRevenue += Number(w.totalRevenue || 0);
    });

    const rows = Array.from(map.values());

    return {
      waiterRows: rows.filter((r) => r.type === "waiter"),
      roomRow: rows.find((r) => r.type === "dhoma") || empty.roomRow,
      umbrellaRow: rows.find((r) => r.type === "cadra") || empty.umbrellaRow,
    };
  }

  return empty;
};

export default function XhiroMobilePage() {
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averagePerDay: 0,
  });

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

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const businessId = useMemo(() => {
    const id = (localStorage.getItem("businessId") || "").trim();
    return id && id !== "undefined" && id !== "null" ? id : "";
  }, []);

  const [from, setFrom] = useState(getSavedDate(DASHBOARD_FROM_KEY));
  const [to, setTo] = useState(getSavedDate(DASHBOARD_TO_KEY));

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setErrMsg("");

        if (!businessId) {
          setErrMsg("Mungon businessId. Hyni sërish në sistem.");
          return;
        }

        const [periodData, waiterStatsRaw] = await Promise.all([
          getPeriodStats(from, to),
          getWaiterStats(from, to),
        ]);

        const totalRevenue = Number(periodData?.totalRevenue || 0);
        const totalOrders = Number(
          periodData?.countOrders || periodData?.orderCount || 0
        );

        const byDay = Array.isArray(periodData?.byDay) ? periodData.byDay : [];
        const activeDays = byDay.length || 1;

        setSummary({
          totalRevenue,
          totalOrders,
          averagePerDay: totalRevenue / activeDays,
        });

        const normalized = normalizeWaiterStats(waiterStatsRaw);

        setWaiterRows(
          [...normalized.waiterRows].sort(
            (a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0)
          )
        );

        setRoomRow(normalized.roomRow);
        setUmbrellaRow(normalized.umbrellaRow);
      } catch (err) {
        console.error("XhiroMobilePage error:", err?.response?.data || err);
        setErrMsg(
          err?.response?.data?.message ||
            err?.message ||
            "Nuk po arrij të marr të dhënat e financave."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [businessId, from, to]);

  const breakdownRows = useMemo(() => {
    return [
      ...waiterRows.map((w) => ({
        ...w,
        label: w.waiterName,
        kind: "Kamarier",
      })),
      { ...roomRow, label: "Dhoma", kind: "Dhoma" },
      { ...umbrellaRow, label: "Cadra", kind: "Cadra" },
    ]
      .filter((r) => Number(r.totalRevenue || 0) > 0 || Number(r.orderCount || 0) > 0)
      .sort((a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0));
  }, [waiterRows, roomRow, umbrellaRow]);

  const topWaiter = waiterRows.length > 0 ? waiterRows[0] : null;

  return (
    <div className="xhiro-mobile-page">
      <div className="xhiro-mobile-shell">
        <section className="xhiro-mobile-hero">
          <div className="xhiro-mobile-hero-left">
            <div className="xhiro-mobile-logo-card">
              <img src={logo} alt="Logo" />
            </div>

            <div>
              <div className="xhiro-mobile-hero-badge">Raporti i periudhës</div>
              <h1 className="xhiro-mobile-title">Financat</h1>
              <p className="xhiro-mobile-subtitle">
                Përmbledhje moderne për xhiron dhe porositë.
              </p>
            </div>
          </div>
        </section>

        <div className="xhiro-mobile-date-picker">
          <div className="date-field">
            <label>Nga</label>
            <div className="date-input-wrap">
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  localStorage.setItem(DASHBOARD_FROM_KEY, e.target.value);
                }}
              />
            </div>
          </div>

          <div className="date-field">
            <label>Deri</label>
            <div className="date-input-wrap">
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  localStorage.setItem(DASHBOARD_TO_KEY, e.target.value);
                }}
              />
            </div>
          </div>
        </div>

        {errMsg && <div className="xhiro-mobile-empty">{errMsg}</div>}

        {loading ? (
          <div className="xhiro-mobile-empty">Duke ngarkuar...</div>
        ) : (
          <>
            <section className="xhiro-main-card">
              <div className="xhiro-main-icon">
  <Wallet size={30} strokeWidth={2.2} />
</div>

              <div>
                <div className="xhiro-card-label">Totali i xhiros</div>
                <div className="xhiro-main-value">
                  {formatMoney(summary.totalRevenue)}
                </div>
                <div className="xhiro-card-subtitle">Për gjithë periudhën</div>
              </div>
            </section>

            <div className="xhiro-mini-grid">
              <section className="xhiro-mini-card">
                <div className="xhiro-mini-icon">
  <ShoppingBag size={24} strokeWidth={2.2} />
</div>
                <div className="xhiro-card-label">Porosi</div>
                <div className="xhiro-mini-value">
                  {summary.totalOrders.toLocaleString("sq-AL")}
                </div>
                <div className="xhiro-card-subtitle">Numri total</div>
              </section>

              <section className="xhiro-mini-card">
                <div className="xhiro-mini-icon">
  <TrendingUp size={24} strokeWidth={2.2} />
</div>
                <div className="xhiro-card-label">Mesatarja / ditë</div>
                <div className="xhiro-mini-value">
                  {formatMoney(summary.averagePerDay)}
                </div>
                <div className="xhiro-card-subtitle">Ditët aktive</div>
              </section>
            </div>

            <section className="xhiro-top-card">
              <div>
                <div className="xhiro-section-mini">Kamarieri më i mirë</div>

                {topWaiter ? (
                  <>
                    <div className="xhiro-top-name">{topWaiter.waiterName}</div>
                    <div className="xhiro-top-meta">
                      {formatMoney(topWaiter.totalRevenue)} ·{" "}
                      {Number(topWaiter.orderCount || 0).toLocaleString("sq-AL")} porosi
                    </div>
                  </>
                ) : (
                  <div className="xhiro-muted">Nuk ka kamarierë me xhiro.</div>
                )}
              </div>

              <div className="xhiro-top-badge">
  <Trophy size={28} strokeWidth={2.2} />
</div>
            </section>

            <section className="xhiro-section-card">
              <div className="xhiro-section-head">
                <h3>Breakdown i xhiros</h3>
                <p>Ndarja sipas burimit të të ardhurave</p>
              </div>

              {breakdownRows.length === 0 ? (
                <div className="xhiro-mobile-empty small">
                  Nuk ka të dhëna për këtë periudhë.
                </div>
              ) : (
                <div className="xhiro-list">
                  {breakdownRows.map((item, index) => (
                    <div className="xhiro-list-item" key={`${item.kind}-${item.label}-${index}`}>
                      <div className="xhiro-list-left">
                        <div className="xhiro-rank">
  <UserRound size={18} strokeWidth={2.4} />
</div>

                        <div>
                          <div className="xhiro-list-name">{item.label}</div>
                          <div className="xhiro-list-kind">{item.kind}</div>
                        </div>
                      </div>

                      <div className="xhiro-list-right">
                        <div className="xhiro-list-total">
                          {formatMoney(item.totalRevenue)}
                        </div>
                        <div className="xhiro-list-orders">
                          {Number(item.orderCount || 0).toLocaleString("sq-AL")} porosi
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="xhiro-section-card">
              <div className="xhiro-section-head">
                <h3>Renditja e kamarierëve</h3>
                <p>Kush ka sjellë më shumë xhiro</p>
              </div>

              {waiterRows.length === 0 ? (
                <div className="xhiro-mobile-empty small">
                  Nuk ka kamarierë me xhiro në këtë periudhë.
                </div>
              ) : (
                <div className="xhiro-list">
                  {waiterRows.map((item, index) => (
                    <div className="xhiro-list-item" key={`${item.waiterName}-${index}`}>
                      <div className="xhiro-list-left">
                        <div className="xhiro-rank">{index + 1}</div>

                        <div>
                          <div className="xhiro-list-name">{item.waiterName}</div>
                          <div className="xhiro-list-kind">Kamarier</div>
                        </div>
                      </div>

                      <div className="xhiro-list-right">
                        <div className="xhiro-list-total">
                          {formatMoney(item.totalRevenue)}
                        </div>
                        <div className="xhiro-list-orders">
                          {Number(item.orderCount || 0).toLocaleString("sq-AL")} porosi
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="xhiro-mobile-bottom-space" />
          </>
        )}
      </div>
    </div>
  );
}