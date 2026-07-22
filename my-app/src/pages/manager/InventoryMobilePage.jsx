import "../../qz-signing";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Search,
  Trophy,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";

import { getInventorySummary } from "../../api/inventoryApi.js";
import "./InventoryMobilePage.css";

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

// Stoku lexohet VETËM për ditët e zgjedhura
const PERIODS = [
  { id: "today", label: "Sot" },
  { id: "yesterday", label: "Dje" },
  { id: "week", label: "7 ditë" },
  { id: "month", label: "30 ditë" },
  { id: "all", label: "Gjithë koha" },
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
    case "all":
      return { from: undefined, to: undefined };
    case "today":
    default:
      return { from: toYMD(today), to: toYMD(today) };
  }
};

export default function InventoryMobilePage() {
  const [periodId, setPeriodId] = useState("today");
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ products: 0, quantity: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const load = useCallback(async () => {
    if (!businessId) {
      setError("Mungon businessId. Hyni si menaxher.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { from, to } = buildRange(periodId);

      const data = await getInventorySummary({ businessId, from, to });

      setItems(Array.isArray(data.items) ? data.items : []);
      setTotals({
        products: Number(data.totalProductsWithSales || 0),
        quantity: Number(data.totalQuantitySold || 0),
      });
    } catch (e) {
      setItems([]);
      setTotals({ products: 0, quantity: 0 });
      setError(
        e?.response?.data?.message || e?.message || "Nuk u lexua inventari."
      );
    } finally {
      setLoading(false);
    }
  }, [businessId, periodId]);

  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(() => {
    const mapped = (items || []).map((it) => ({
      id: String(it.productId || it._id || it.productName),
      name: String(it.productName || it.name || "").trim(),
      sold: Number(it.sold || 0),
    }));

    const q = search.trim().toLowerCase();
    const filtered = q
      ? mapped.filter((x) => x.name.toLowerCase().includes(q))
      : mapped;

    return filtered.sort((a, b) => b.sold - a.sold);
  }, [items, search]);

  const top = list.length > 0 && list[0].sold > 0 ? list[0] : null;
  const maxSold = top ? top.sold : 0;

  return (
    <div className="inm-page">
      {/* HERO */}
      <section className="inm-hero">
        <h1>
          <Boxes size={20} strokeWidth={2.3} />
          Stoku i Shitjeve
        </h1>

        <div className="inm-periods">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={periodId === p.id ? "active" : ""}
              onClick={() => setPeriodId(p.id)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <div className="inm-body">
        {/* PËRMBLEDHJA */}
        <div className="inm-summary">
          <div className="inm-sum-card">
            <span className="inm-sum-icon blue">
              <PackageCheck size={17} strokeWidth={2.3} />
            </span>
            <b>{loading ? "…" : totals.products}</b>
            <em>Produkte me shitje</em>
          </div>

          <div className="inm-sum-card">
            <span className="inm-sum-icon green">
              <ShoppingBag size={17} strokeWidth={2.3} />
            </span>
            <b>{loading ? "…" : totals.quantity}</b>
            <em>Copë të shitura</em>
          </div>

          <div className="inm-sum-card">
            <span className="inm-sum-icon gold">
              <Trophy size={17} strokeWidth={2.3} />
            </span>
            <b className="small">{loading ? "…" : top ? top.name : "—"}</b>
            <em>{top ? `${top.sold} shitje` : "Më i shituri"}</em>
          </div>
        </div>

        {/* KËRKIMI */}
        <div className="inm-search">
          <Search size={16} strokeWidth={2.4} />
          <input
            type="search"
            placeholder="Kërko produkt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <div className="inm-error">{error}</div>}

        {/* LISTA */}
        {loading ? (
          <div className="inm-empty">Duke ngarkuar…</div>
        ) : list.length === 0 ? (
          <div className="inm-empty">
            {search
              ? `S'u gjet asnjë për "${search}".`
              : "Nuk ka shitje për këtë periudhë."}
          </div>
        ) : (
          <ul className="inm-list">
            {list.map((item, idx) => {
              const pct = maxSold > 0 ? (item.sold / maxSold) * 100 : 0;

              return (
                <li key={item.id} className="inm-item">
                  <span className="inm-rank">{idx + 1}</span>

                  <span className="inm-item-main">
                    <strong>{item.name}</strong>
                    <span className="inm-bar">
                      <span
                        className="inm-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </span>

                  <span className="inm-sold">
                    {item.sold}
                    <em>copë</em>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}