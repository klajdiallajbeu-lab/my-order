import "../../qz-signing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ShoppingCart,
  Users,
  BedDouble,
  Package,
  LayoutGrid,
  ClipboardList,
  Utensils,
  Umbrella,
  Boxes,
  DollarSign,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { getPeriodStats } from "../../api/statsApi.js";
import { getOrders } from "../../api/ordersApi.js";
import "./ManagerMobileHome.css";

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

/** Periudhat e disponueshme te dropdown-i i datës */
const PERIODS = [
  { id: "today", label: "Sot", days: 0 },
  { id: "yesterday", label: "Dje", days: 1 },
  { id: "week", label: "7 ditë", days: 6 },
  { id: "month", label: "30 ditë", days: 29 },
];

/** Kthen { from, to, prevFrom, prevTo } në formatin YYYY-MM-DD */
const buildRange = (periodId) => {
  const today = new Date();

  if (periodId === "yesterday") {
    const d = addDays(today, -1);
    const p = addDays(today, -2);
    return { from: toYMD(d), to: toYMD(d), prevFrom: toYMD(p), prevTo: toYMD(p) };
  }

  const period = PERIODS.find((p) => p.id === periodId) || PERIODS[0];
  const span = period.days;

  const from = addDays(today, -span);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -span);

  return {
    from: toYMD(from),
    to: toYMD(today),
    prevFrom: toYMD(prevFrom),
    prevTo: toYMD(prevTo),
  };
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("sq-AL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

/** Diferenca në përqindje mes dy periudhave */
const diffPercent = (current, previous) => {
  const cur = Number(current || 0);
  const prev = Number(previous || 0);

  if (!prev) return cur > 0 ? 100 : 0;

  return ((cur - prev) / prev) * 100;
};

const timeAgo = (dateValue) => {
  const then = new Date(dateValue).getTime();
  if (!then || Number.isNaN(then)) return "";

  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000));

  if (diffMin < 1) return "tani";
  if (diffMin === 1) return "1 minutë më parë";
  if (diffMin < 60) return `${diffMin} minuta më parë`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours === 1) return "1 orë më parë";
  if (diffHours < 24) return `${diffHours} orë më parë`;

  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? "dje" : `${diffDays} ditë më parë`;
};

const SOURCE_META = {
  tavoline: { label: "Tavolina", Icon: Utensils, tone: "blue" },
  dhoma: { label: "Dhoma", Icon: BedDouble, tone: "purple" },
  cadra: { label: "Çadra", Icon: Umbrella, tone: "sky" },
};

const STATUS_META = {
  done: { label: "Përfunduar", tone: "ok" },
  accepted: { label: "Pranuar", tone: "info" },
  pending: { label: "Në pritje", tone: "warn" },
  cancelled: { label: "Anuluar", tone: "bad" },
};

/* ---------- komponenti ---------- */

export default function ManagerMobileHome() {
  const navigate = useNavigate();

  const [periodId, setPeriodId] = useState("today");
  const [pickerOpen, setPickerOpen] = useState(false);

  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    revenueDiff: 0,
    ordersDiff: 0,
    activeTables: 0,
    activeRooms: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const managerName = useMemo(
    () => (sessionStorage.getItem("userName") || "").trim(),
    []
  );

  const activePeriod =
    PERIODS.find((p) => p.id === periodId) || PERIODS[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrMsg("");

    const { from, to, prevFrom, prevTo } = buildRange(periodId);

    try {
      const [current, previous, ordersRes] = await Promise.all([
        getPeriodStats(from, to).catch(() => null),
        getPeriodStats(prevFrom, prevTo).catch(() => null),
        getOrders({ businessId, from, to }).catch(() => null),
      ]);

      const revenue = Number(current?.totalRevenue || 0);
      const orders = Number(
        current?.countOrders ?? current?.orderCount ?? 0
      );

      const prevRevenue = Number(previous?.totalRevenue || 0);
      const prevOrders = Number(
        previous?.countOrders ?? previous?.orderCount ?? 0
      );

      const list = Array.isArray(ordersRes?.data) ? ordersRes.data : [];

      // "Aktive" = porosi të hapura (pending ose accepted), të grupuara
      // sipas numrit të vendit që të mos numërohen dy herë.
      const openOrders = list.filter((o) =>
        ["pending", "accepted"].includes(String(o?.status || ""))
      );

      const distinctBySource = (type) =>
        new Set(
          openOrders
            .filter((o) => String(o?.sourceType || "") === type)
            .map((o) => String(o?.sourceNumber || ""))
            .filter(Boolean)
        ).size;

      const sorted = list
        .slice()
        .sort(
          (a, b) =>
            new Date(b?.createdAt || 0).getTime() -
            new Date(a?.createdAt || 0).getTime()
        );

      setStats({
        revenue,
        orders,
        revenueDiff: diffPercent(revenue, prevRevenue),
        ordersDiff: diffPercent(orders, prevOrders),
        activeTables: distinctBySource("tavoline"),
        activeRooms: distinctBySource("dhoma"),
      });

      setRecentOrders(sorted.slice(0, 5));
    } catch (err) {
      console.error("ManagerMobileHome:", err);
      setErrMsg("Nuk mund të ngarkoj të dhënat. Provo përsëri.");
    } finally {
      setLoading(false);
    }
  }, [businessId, periodId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const shortcuts = [
    { label: "Produkte", Icon: Package, to: "/manager/products", tone: "blue" },
    { label: "Kategoritë", Icon: LayoutGrid, to: "/manager/subcategory", tone: "blue" },
    { label: "Porositë", Icon: ClipboardList, to: "/manager/orders", tone: "blue" },
    { label: "Tavolina", Icon: Utensils, to: "/manager/places", tone: "blue" },
    { label: "Dhoma", Icon: BedDouble, to: "/manager/places", tone: "blue" },
    { label: "Çadra", Icon: Umbrella, to: "/manager/places", tone: "blue" },
    { label: "Stoku", Icon: Boxes, to: "/manager/inventari", tone: "blue" },
    { label: "Këmbimi Valutor", Icon: DollarSign, to: "/manager/kembimi-valutor", tone: "blue" },
    { label: "Raporte", Icon: BarChart3, to: "/manager/xhiro", tone: "blue" },
  ];

  const statCards = [
    {
      key: "revenue",
      label: "TOTAL XHIRO",
      value: formatMoney(stats.revenue),
      suffix: "ALL",
      diff: stats.revenueDiff,
      Icon: TrendingUp,
      tone: "blue",
    },
    {
      key: "orders",
      label: "POROSI",
      value: String(stats.orders),
      suffix: "",
      diff: stats.ordersDiff,
      Icon: ShoppingCart,
      tone: "green",
    },
    {
      key: "tables",
      label: "TAVOLINA AKTIVE",
      value: String(stats.activeTables),
      suffix: "",
      diff: null,
      Icon: Users,
      tone: "purple",
    },
    {
      key: "rooms",
      label: "DHOMA AKTIVE",
      value: String(stats.activeRooms),
      suffix: "",
      diff: null,
      Icon: BedDouble,
      tone: "orange",
    },
  ];

  return (
    <div className="mmh-page">
      {/* HERO */}
      <section className="mmh-hero">
        <div className="mmh-hero-row">
          <div className="mmh-hero-text">
            <h1>
              Përshëndetje{managerName ? `, ${managerName}` : ", Menaxher"}!
            </h1>
            <p>Mirë se erdhët në panelin e menaxhimit.</p>
          </div>

          <div className="mmh-period">
            <button
              type="button"
              className="mmh-period-btn"
              onClick={() => setPickerOpen((v) => !v)}
            >
              <Calendar size={17} strokeWidth={2.2} />
              <span>{activePeriod.label}</span>
              <ChevronDown
                size={16}
                strokeWidth={2.4}
                className={pickerOpen ? "mmh-rot" : ""}
              />
            </button>

            {pickerOpen && (
              <div className="mmh-period-menu">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={p.id === periodId ? "active" : ""}
                    onClick={() => {
                      setPeriodId(p.id);
                      setPickerOpen(false);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TRUPI I BARDHË */}
      <div className="mmh-sheet">
        {errMsg && <div className="mmh-error">{errMsg}</div>}

        {/* STAT CARDS */}
        <section className="mmh-stats">
          {statCards.map((card) => {
            const CardIcon = card.Icon;
            const up = Number(card.diff) >= 0;

            return (
              <article
                key={card.key}
                className={`mmh-stat mmh-tone-${card.tone}`}
              >
                <span className="mmh-stat-icon">
                  <CardIcon size={19} strokeWidth={2.3} />
                </span>

                <span className="mmh-stat-label">{card.label}</span>

                <div className="mmh-stat-value">
                  {loading ? (
                    <span className="mmh-skeleton" />
                  ) : (
                    <>
                      <strong>{card.value}</strong>
                      {card.suffix && <em>{card.suffix}</em>}
                    </>
                  )}
                </div>

                {card.diff !== null && !loading && (
                  <span
                    className={`mmh-stat-diff ${up ? "up" : "down"}`}
                  >
                    {up ? (
                      <ArrowUp size={13} strokeWidth={2.8} />
                    ) : (
                      <ArrowDown size={13} strokeWidth={2.8} />
                    )}
                    {Math.abs(card.diff).toFixed(1)}% nga më parë
                  </span>
                )}
              </article>
            );
          })}
        </section>

        {/* SHKURTORE */}
        <section className="mmh-block">
          <h2 className="mmh-block-title">Shkurtore</h2>

          <div className="mmh-shortcuts">
            {shortcuts.map((s) => {
              const SIcon = s.Icon;

              return (
                <button
                  key={s.label}
                  type="button"
                  className="mmh-shortcut"
                  onClick={() => navigate(s.to)}
                >
                  <span className="mmh-shortcut-icon">
                    <SIcon size={19} strokeWidth={2.2} />
                  </span>

                  <span className="mmh-shortcut-label">{s.label}</span>

                  <ChevronRight
                    size={15}
                    strokeWidth={2.4}
                    className="mmh-shortcut-arrow"
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* POROSITË E FUNDIT */}
        <section className="mmh-card">
          <div className="mmh-card-head">
            <h2>Porositë e fundit</h2>

            <button
              type="button"
              className="mmh-link"
              onClick={() => navigate("/manager/orders")}
            >
              Shiko të gjitha
            </button>
          </div>

          {loading ? (
            <div className="mmh-empty">Duke ngarkuar…</div>
          ) : recentOrders.length === 0 ? (
            <div className="mmh-empty">Nuk ka porosi për këtë periudhë.</div>
          ) : (
            <ul className="mmh-orders">
              {recentOrders.map((order) => {
                const meta =
                  SOURCE_META[String(order?.sourceType || "")] ||
                  SOURCE_META.tavoline;

                const OrderIcon = meta.Icon;

                const status =
                  STATUS_META[String(order?.status || "")] ||
                  STATUS_META.pending;

                return (
                  <li
                    key={order._id}
                    className="mmh-order"
                    onClick={() => navigate(`/manager/order/${order._id}`)}
                  >
                    <span className={`mmh-order-avatar tone-${meta.tone}`}>
                      <OrderIcon size={18} strokeWidth={2.3} />
                    </span>

                    <span className="mmh-order-main">
                      <strong>
                        {meta.label} {order?.sourceNumber || ""}
                      </strong>
                      <em>{timeAgo(order?.createdAt)}</em>
                    </span>

                    <span className="mmh-order-side">
                      <b>
                        {formatMoney(order?.totalALL ?? order?.total)}{" "}
                        <i>ALL</i>
                      </b>
                      <span className={`mmh-badge ${status.tone}`}>
                        {status.label}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}