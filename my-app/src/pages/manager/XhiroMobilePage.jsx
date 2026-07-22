import "../../qz-signing";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  ShoppingBag,
  TrendingUp,
  Trophy,
  UserRound,
  BedDouble,
  Umbrella,
  Calendar,
} from "lucide-react";

import { getPeriodStats, getWaiterStats } from "../../api/statsApi.js";
import "./XhiroMobilePage.css";

/* ---------- helpers ---------- */

const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const PERIODS = [
  { id: "today", label: "Sot" },
  { id: "yesterday", label: "Dje" },
  { id: "week", label: "7 ditë" },
  { id: "month", label: "30 ditë" },
  { id: "custom", label: "Zgjidh datat" },
];

const buildRange = (periodId) => {
  const today = new Date();

  switch (periodId) {
    case "yesterday": {
      const d = addDays(today, -1);
      return { from: toYMD(d), to: toYMD(d) };
    }
    case "week":
      return { from: toYMD(addDays(today, -6)), to: toYMD(today) };
    case "month":
      return { from: toYMD(addDays(today, -29)), to: toYMD(today) };
    case "today":
    default:
      return { from: toYMD(today), to: toYMD(today) };
  }
};

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("sq-AL", {
    maximumFractionDigits: 0,
  })} ALL`;

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

/* ---------- komponenti ---------- */

export default function XhiroMobilePage() {
  const [periodId, setPeriodId] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averagePerDay: 0,
  });

  const [waiterRows, setWaiterRows] = useState([]);
  const [roomRow, setRoomRow] = useState({ orderCount: 0, totalRevenue: 0 });
  const [umbrellaRow, setUmbrellaRow] = useState({ orderCount: 0, totalRevenue: 0 });

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const businessId = useMemo(() => {
    const id = (localStorage.getItem("businessId") || "").trim();
    return id && id !== "undefined" && id !== "null" ? id : "";
  }, []);

  const range = useMemo(() => {
    if (periodId === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return buildRange(periodId);
  }, [periodId, customFrom, customTo]);

  const loadData = useCallback(async () => {
    if (!businessId) {
      setErrMsg("Mungon businessId. Hyni sërish në sistem.");
      setLoading(false);
      return;
    }

    // për "Zgjidh datat" prit derisa të dyja të plotësohen
    if (periodId === "custom" && (!customFrom || !customTo)) return;

    setLoading(true);
    setErrMsg("");

    try {
      const [periodData, waiterStatsRaw] = await Promise.all([
        getPeriodStats(range.from, range.to),
        getWaiterStats(range.from, range.to),
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
      console.error("XhiroMobilePage:", err?.response?.data || err);
      setErrMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Nuk po arrij të marr të dhënat e financave."
      );
    } finally {
      setLoading(false);
    }
  }, [businessId, periodId, customFrom, customTo, range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* rreshtat e breakdown-it */
  const breakdownRows = useMemo(() => {
    const rows = [
      ...waiterRows.map((w) => ({
        label: w.waiterName,
        kind: "Kamarier",
        icon: "waiter",
        orderCount: w.orderCount,
        totalRevenue: w.totalRevenue,
      })),
      {
        label: "Dhoma",
        kind: "Dhoma",
        icon: "room",
        orderCount: roomRow.orderCount,
        totalRevenue: roomRow.totalRevenue,
      },
      {
        label: "Çadra",
        kind: "Çadra",
        icon: "umbrella",
        orderCount: umbrellaRow.orderCount,
        totalRevenue: umbrellaRow.totalRevenue,
      },
    ]
      .filter(
        (r) =>
          Number(r.totalRevenue || 0) > 0 || Number(r.orderCount || 0) > 0
      )
      .sort(
        (a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0)
      );

    return rows;
  }, [waiterRows, roomRow, umbrellaRow]);

  const maxRevenue =
    breakdownRows.length > 0 ? Number(breakdownRows[0].totalRevenue || 0) : 0;

  const topWaiter = waiterRows.length > 0 ? waiterRows[0] : null;

  const rowIcon = (icon) => {
    if (icon === "room") return <BedDouble size={17} strokeWidth={2.3} />;
    if (icon === "umbrella") return <Umbrella size={17} strokeWidth={2.3} />;
    return <UserRound size={17} strokeWidth={2.3} />;
  };

  return (
    <div className="xhm-page">
      {/* HERO */}
      <section className="xhm-hero">
        <h1>
          <Wallet size={20} strokeWidth={2.3} />
          Financat
        </h1>
        <p>Xhiroja dhe porositë sipas periudhës</p>

        <div className="xhm-periods">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={periodId === p.id ? "active" : ""}
              onClick={() => setPeriodId(p.id)}
              disabled={loading && periodId !== p.id}
            >
              {p.id === "custom" && (
                <Calendar size={13} strokeWidth={2.5} />
              )}
              {p.label}
            </button>
          ))}
        </div>

        {periodId === "custom" && (
          <div className="xhm-custom-dates">
            <label>
              <span>Nga</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>

            <label>
              <span>Deri</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      <div className="xhm-body">
        {errMsg && <div className="xhm-error">{errMsg}</div>}

        {loading ? (
          <div className="xhm-empty">Duke ngarkuar…</div>
        ) : (
          <>
            {/* KARTA KRYESORE */}
            <section className="xhm-main-card">
              <span className="xhm-main-icon">
                <Wallet size={22} strokeWidth={2.3} />
              </span>

              <div className="xhm-main-text">
                <em>TOTALI I XHIROS</em>
                <strong>{formatMoney(summary.totalRevenue)}</strong>
              </div>
            </section>

            {/* DY MINI-KARTA */}
            <div className="xhm-mini-grid">
              <section className="xhm-mini-card">
                <span className="xhm-mini-icon green">
                  <ShoppingBag size={17} strokeWidth={2.3} />
                </span>
                <b>{summary.totalOrders.toLocaleString("sq-AL")}</b>
                <em>Porosi</em>
              </section>

              <section className="xhm-mini-card">
                <span className="xhm-mini-icon purple">
                  <TrendingUp size={17} strokeWidth={2.3} />
                </span>
                <b>{formatMoney(summary.averagePerDay)}</b>
                <em>Mesatarja / ditë</em>
              </section>
            </div>

            {/* KAMARIERI ME I MIRE */}
            {topWaiter && (
              <section className="xhm-top-card">
                <span className="xhm-top-icon">
                  <Trophy size={20} strokeWidth={2.3} />
                </span>

                <div className="xhm-top-text">
                  <em>Kamarieri më i mirë</em>
                  <strong>{topWaiter.waiterName}</strong>
                  <span>
                    {formatMoney(topWaiter.totalRevenue)} ·{" "}
                    {Number(topWaiter.orderCount || 0).toLocaleString("sq-AL")}{" "}
                    porosi
                  </span>
                </div>
              </section>
            )}

            {/* BREAKDOWN */}
            <section className="xhm-card">
              <div className="xhm-card-head">
                <h2>Ndarja e xhiros</h2>
                <p>Sipas burimit të të ardhurave</p>
              </div>

              {breakdownRows.length === 0 ? (
                <div className="xhm-empty small">
                  Nuk ka të dhëna për këtë periudhë.
                </div>
              ) : (
                <ul className="xhm-list">
                  {breakdownRows.map((item, index) => {
                    const pct =
                      maxRevenue > 0
                        ? (Number(item.totalRevenue || 0) / maxRevenue) * 100
                        : 0;

                    return (
                      <li
                        key={`${item.kind}-${item.label}-${index}`}
                        className="xhm-row"
                      >
                        <span className="xhm-row-icon">
                          {rowIcon(item.icon)}
                        </span>

                        <span className="xhm-row-main">
                          <span className="xhm-row-top">
                            <strong>{item.label}</strong>
                            <b>{formatMoney(item.totalRevenue)}</b>
                          </span>

                          <span className="xhm-bar">
                            <span
                              className="xhm-bar-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </span>

                          <span className="xhm-row-sub">
                            {item.kind} ·{" "}
                            {Number(item.orderCount || 0).toLocaleString(
                              "sq-AL"
                            )}{" "}
                            porosi
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* RENDITJA E KAMARIEREVE */}
            <section className="xhm-card">
              <div className="xhm-card-head">
                <h2>Renditja e kamarierëve</h2>
                <p>Kush ka sjellë më shumë xhiro</p>
              </div>

              {waiterRows.length === 0 ? (
                <div className="xhm-empty small">
                  Nuk ka kamarierë me xhiro në këtë periudhë.
                </div>
              ) : (
                <ul className="xhm-list">
                  {waiterRows.map((item, index) => (
                    <li
                      key={`${item.waiterName}-${index}`}
                      className="xhm-row"
                    >
                      <span
                        className={`xhm-rank ${index === 0 ? "gold" : ""}`}
                      >
                        {index + 1}
                      </span>

                      <span className="xhm-row-main">
                        <span className="xhm-row-top">
                          <strong>{item.waiterName}</strong>
                          <b>{formatMoney(item.totalRevenue)}</b>
                        </span>

                        <span className="xhm-row-sub">
                          {Number(item.orderCount || 0).toLocaleString(
                            "sq-AL"
                          )}{" "}
                          porosi
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}