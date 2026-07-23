import "../../qz-signing";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  X,
  Lock,
  LockKeyhole,
  ChevronLeft,
  ChevronRight,
  Zap,
  Droplets,
  Flame,
  Home,
  Users,
  Truck,
  Shield,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
} from "lucide-react";

import { getPeriodStats, getTopProducts } from "../../api/statsApi.js";
import {
  getExpensesApi,
  createExpenseApi,
  deleteExpenseApi,
  getClosedPeriodsApi,
  closePeriodApi,
} from "../../api/expenseApi.js";
import { getInventorySummary } from "../../api/inventoryApi.js";
import "./RaportFitimiPage.css";

/* ---------- helpers ---------- */

const pad2 = (n) => String(n).padStart(2, "0");

const toYMD = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const toYM = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const names = [
    "Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor",
    "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor",
  ];
  return `${names[(m || 1) - 1]} ${y}`;
};

// Intervali i plotë i muajit "YYYY-MM"
const monthRange = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { from: toYMD(first), to: toYMD(last) };
};

const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toYM(d);
};

export const CATEGORIES = [
  { id: "drita", label: "Drita", Icon: Zap },
  { id: "uje", label: "Uji", Icon: Droplets },
  { id: "gaz", label: "Gazi", Icon: Flame },
  { id: "qera", label: "Qeraja", Icon: Home },
  { id: "rroga", label: "Rroga", Icon: Users },
  { id: "furnizime", label: "Furnizime", Icon: Truck },
  { id: "siguracione", label: "Siguracione", Icon: Shield },
  { id: "tjeter", label: "Të tjera", Icon: MoreHorizontal },
];

const catMeta = (id) =>
  CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const money = (v) =>
  Number(v || 0).toLocaleString("sq-AL", { maximumFractionDigits: 0 });

const money2 = (v) =>
  Number(v || 0).toLocaleString("sq-AL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("sq-AL");
};

/* ---------- komponenti ---------- */

export default function RaportFitimiPage() {
  const [month, setMonth] = useState(() => toYM(new Date()));

  const [revenue, setRevenue] = useState(0);
  const [orders, setOrders] = useState(0);
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expTotal, setExpTotal] = useState(0);

  const [closedMonths, setClosedMonths] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState("");

  const [form, setForm] = useState({
    category: "drita",
    amount: "",
    note: "",
    date: toYMD(new Date()),
  });

  const businessName = useMemo(
    () =>
      (
        sessionStorage.getItem("businessName") ||
        localStorage.getItem("businessName") ||
        localStorage.getItem("hotelName") ||
        ""
      ).trim(),
    []
  );

  const range = useMemo(() => monthRange(month), [month]);

  const isLocked = closedMonths.includes(month);
  const currentMonth = toYM(new Date());
  const isFuture = month > currentMonth;

  /* ---------- data ---------- */

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [periodData, topProducts, expData, invData, closedData] =
        await Promise.all([
          getPeriodStats(range.from, range.to),
          getTopProducts(range.from, range.to, 500),
          getExpensesApi(range.from, range.to),
          getInventorySummary({ from: range.from, to: range.to }).catch(
            () => null
          ),
          getClosedPeriodsApi().catch(() => ({ months: [] })),
        ]);

      setRevenue(Number(periodData?.totalRevenue || 0));
      setOrders(Number(periodData?.countOrders || periodData?.orderCount || 0));

      // Harta emër -> lloj (ushqime/pije) për ndarjen Restorant/Bar
      const typeByName = new Map();
      for (const it of Array.isArray(invData?.items) ? invData.items : []) {
        const nm = String(it.productName || "").trim().toLowerCase();
        if (!nm) continue;
        const ct = String(it.categoryType || "").toLowerCase();
        typeByName.set(
          nm,
          ct.includes("pije") || ct.includes("bar") ? "pije" : "ushqime"
        );
      }

      setProducts(
        (Array.isArray(topProducts) ? topProducts : [])
          .map((p) => {
            const name = p.name || p.productName || "Pa emër";
            return {
              name,
              type:
                typeByName.get(String(name).trim().toLowerCase()) || "ushqime",
              qty: Number(p.qty || 0),
              revenue: Number(p.revenue || 0),
            };
          })
          .filter((p) => p.qty > 0 || p.revenue > 0)
      );

      setExpenses(Array.isArray(expData?.expenses) ? expData.expenses : []);
      setExpTotal(Number(expData?.total || 0));
      setClosedMonths(
        Array.isArray(closedData?.months) ? closedData.months : []
      );
    } catch (err) {
      console.error("RaportFitimiPage:", err?.response?.data || err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Nuk po arrij të marr të dhënat."
      );
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const profit = revenue - expTotal;

  /* ---------- llogaritjet ---------- */

  const catSplit = useMemo(() => {
    const rest = { revenue: 0, qty: 0 };
    const bar = { revenue: 0, qty: 0 };

    for (const p of products) {
      const target = p.type === "pije" ? bar : rest;
      target.revenue += p.revenue;
      target.qty += p.qty;
    }

    const total = rest.revenue + bar.revenue;

    return {
      rest,
      bar,
      restPct: total > 0 ? (rest.revenue / total) * 100 : 0,
      barPct: total > 0 ? (bar.revenue / total) * 100 : 0,
    };
  }, [products]);

  const avgPerOrder = orders > 0 ? revenue / orders : 0;
  const avgRest =
    catSplit.rest.qty > 0 ? catSplit.rest.revenue / catSplit.rest.qty : 0;
  const avgBar =
    catSplit.bar.qty > 0 ? catSplit.bar.revenue / catSplit.bar.qty : 0;

  const totalQty = useMemo(
    () => products.reduce((s, p) => s + p.qty, 0),
    [products]
  );

  // Shpenzimet e grupuara sipas kategorise (per raport dhe printim)
  const expByCategory = useMemo(() => {
    const map = new Map();

    for (const c of CATEGORIES) {
      map.set(c.id, { id: c.id, label: c.label, Icon: c.Icon, total: 0, items: [] });
    }

    for (const e of expenses) {
      const key = map.has(e.category) ? e.category : "tjeter";
      const row = map.get(key);
      row.total += Number(e.amount || 0);
      row.items.push(e);
    }

    return Array.from(map.values())
      .filter((r) => r.total > 0 || r.items.length > 0)
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const maxCatTotal =
    expByCategory.length > 0 ? expByCategory[0].total : 0;

  const now = new Date();
  const printMeta = {
    date: now.toLocaleDateString("sq-AL"),
    time: now.toLocaleTimeString("sq-AL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  const periodLabel = monthLabel(month);

  /* ---------- veprime ---------- */

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openAdd = () => {
    if (isLocked) return;

    // data e parazgjedhur brenda muajit që po shikon
    const today = new Date();
    const defaultDate =
      toYM(today) === month ? toYMD(today) : monthRange(month).to;

    setForm({ category: "drita", amount: "", note: "", date: defaultDate });
    setError("");
    setShowAdd(true);
  };

  const saveExpense = async () => {
    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Vendos një shumë të vlefshme.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await createExpenseApi({
        category: form.category,
        amount,
        note: form.note.trim(),
        date: form.date,
      });

      // forma mbetet e hapur — pastrohet vetëm shuma dhe komenti
      setForm((prev) => ({ ...prev, amount: "", note: "" }));

      setSavedFlash(`U shtua: ${catMeta(form.category).label} ${money(amount)} ALL`);
      setTimeout(() => setSavedFlash(""), 3000);

      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Gabim gjatë ruajtjes.");
    } finally {
      setBusy(false);
    }
  };

  const removeExpense = async (exp) => {
    if (isLocked) return;

    const meta = catMeta(exp.category);
    const ok = window.confirm(
      `Fshi shpenzimin "${meta.label} — ${money(exp.amount)} ALL"?`
    );
    if (!ok) return;

    try {
      await deleteExpenseApi(exp._id);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Gabim gjatë fshirjes.");
    }
  };

  const confirmClose = async () => {
    setBusy(true);
    setError("");

    try {
      await closePeriodApi({
        month,
        snapshot: { revenue, expenses: expTotal, profit, orders },
      });

      setShowCloseConfirm(false);
      setNotice(`${periodLabel} u mbyll. Të dhënat tani janë vetëm për lexim.`);
      setTimeout(() => setNotice(""), 5000);

      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Gabim gjatë mbylljes.");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- render ---------- */

  return (
    <div className="rpt-page">
      {/* ================= TOOLBAR (vetëm ekran) ================= */}
      <header className="rpt-toolbar rpt-no-print">
        <div className="rpt-toolbar-left">
          <span className="rpt-toolbar-icon">
            <FileText size={20} strokeWidth={2.3} />
          </span>

          <div>
            <h1>Raporti i Fitimit</h1>
            <p>{businessName || "Biznesi"}</p>
          </div>
        </div>

        <div className="rpt-month-nav">
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Muaji i mëparshëm"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>

          <div className="rpt-month-label">
            <strong>{periodLabel}</strong>
            {isLocked && (
              <span className="rpt-lock-badge">
                <Lock size={11} strokeWidth={2.8} />
                E mbyllur
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= currentMonth}
            aria-label="Muaji tjetër"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="rpt-toolbar-actions">
          {!isLocked && !isFuture && (
            <button
              type="button"
              className="rpt-btn ghost"
              onClick={() => setShowCloseConfirm(true)}
              disabled={loading}
            >
              <LockKeyhole size={16} strokeWidth={2.4} />
              Mbyll muajin
            </button>
          )}

          <button
            type="button"
            className="rpt-btn primary"
            onClick={() => window.print()}
          >
            <Printer size={16} strokeWidth={2.4} />
            Printo A4
          </button>
        </div>
      </header>

      <div className="rpt-body">
        {notice && <div className="rpt-notice rpt-no-print">{notice}</div>}
        {error && <div className="rpt-error rpt-no-print">{error}</div>}

        {isLocked && (
          <div className="rpt-locked-bar rpt-no-print">
            <Lock size={16} strokeWidth={2.5} />
            <div>
              <strong>Periudhë e mbyllur</strong>
              <span>
                Të dhënat e {periodLabel} janë arkivuar. Nuk mund të shtohen apo
                fshihen shpenzime — vetëm shikim dhe printim.
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rpt-empty rpt-no-print">Duke ngarkuar…</div>
        ) : (
          <div className="rpt-report rpt-screen">
            <header className="rpt-doc-head">
              <div>
                <h2>{businessName || "Raporti Financiar"}</h2>
                <p>Periudha: {periodLabel}</p>
              </div>
              <div className="rpt-doc-brand">
                <span>MY</span>ORDER
              </div>
            </header>

            {/* PËRMBLEDHJA */}
            <section className="rpt-summary">
              <div className="rpt-sum-card in">
                <em>XHIROJA TOTALE</em>
                <strong>{money(revenue)} ALL</strong>
                <span>{orders.toLocaleString("sq-AL")} porosi</span>
              </div>

              <div className="rpt-sum-card out">
                <em>SHPENZIMET</em>
                <strong>−{money(expTotal)} ALL</strong>
                <span>{expenses.length} fatura</span>
              </div>

              <div className={`rpt-sum-card profit ${profit < 0 ? "neg" : ""}`}>
                <em>FITIMI</em>
                <strong>
                  {profit < 0 ? "−" : ""}
                  {money(Math.abs(profit))} ALL
                </strong>
                <span>
                  {profit >= 0 ? (
                    <>
                      <TrendingUp size={12} strokeWidth={2.6} /> pozitiv
                    </>
                  ) : (
                    <>
                      <TrendingDown size={12} strokeWidth={2.6} /> negativ
                    </>
                  )}
                </span>
              </div>
            </section>

            {/* XHIRO SIPAS KATEGORISË */}
            <section className="rpt-block">
              <h3>Xhiro sipas kategorisë</h3>

              <div className="rpt-split">
                <div className="rpt-split-row">
                  <span>Restorant</span>
                  <div className="rpt-split-bar">
                    <div style={{ width: `${catSplit.restPct}%` }} />
                  </div>
                  <b>{money(catSplit.rest.revenue)} ALL</b>
                  <i>{catSplit.restPct.toFixed(1)}%</i>
                </div>

                <div className="rpt-split-row bar">
                  <span>Bar</span>
                  <div className="rpt-split-bar">
                    <div style={{ width: `${catSplit.barPct}%` }} />
                  </div>
                  <b>{money(catSplit.bar.revenue)} ALL</b>
                  <i>{catSplit.barPct.toFixed(1)}%</i>
                </div>
              </div>
            </section>

            {/* PRODUKTET */}
            <section className="rpt-block">
              <h3>Produktet e shitura</h3>

              {products.length === 0 ? (
                <div className="rpt-empty small">
                  Nuk ka shitje për këtë periudhë.
                </div>
              ) : (
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Produkti</th>
                      <th>Kategoria</th>
                      <th className="num">Sasia</th>
                      <th className="num">Çmimi mes.</th>
                      <th className="num">Vlera (ALL)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={`${p.name}-${i}`}>
                        <td>{i + 1}</td>
                        <td>{p.name}</td>
                        <td>{p.type === "pije" ? "Bar" : "Restorant"}</td>
                        <td className="num">{money(p.qty)}</td>
                        <td className="num">
                          {p.qty > 0 ? money2(p.revenue / p.qty) : "0.00"}
                        </td>
                        <td className="num">{money(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Totali</td>
                      <td className="num">{money(totalQty)}</td>
                      <td />
                      <td className="num">{money(revenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </section>

            {/* SHPENZIMET */}
            <section className="rpt-block">
              <div className="rpt-block-head">
                <h3>Shpenzimet (faturat)</h3>

                {!isLocked && (
                  <button
                    type="button"
                    className={`rpt-add-btn rpt-no-print ${showAdd ? "open" : ""}`}
                    onClick={() => (showAdd ? setShowAdd(false) : openAdd())}
                  >
                    <Plus size={15} strokeWidth={2.6} />
                    {showAdd ? "Mbyll formën" : "Shto faturë"}
                  </button>
                )}
              </div>

              {/* FORMA INLINE — qëndron e hapur për shtim të shpejtë */}
              {showAdd && !isLocked && (
                <div className="rpt-inline-form rpt-no-print">
                  <div className="rpt-inline-cats">
                    {CATEGORIES.map((c) => {
                      const CatIcon = c.Icon;

                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={form.category === c.id ? "active" : ""}
                          onClick={() => setField("category", c.id)}
                        >
                          <CatIcon size={14} strokeWidth={2.3} />
                          {c.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="rpt-inline-row">
                    <label className="rpt-inline-field amount">
                      <span>Shuma (ALL)</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={form.amount}
                        onChange={(e) => setField("amount", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveExpense();
                        }}
                      />
                    </label>

                    <label className="rpt-inline-field date">
                      <span>Data</span>
                      <input
                        type="date"
                        min={range.from}
                        max={range.to}
                        value={form.date}
                        onChange={(e) => setField("date", e.target.value)}
                      />
                    </label>

                    <label className="rpt-inline-field note">
                      <span>
                        {form.category === "rroga"
                          ? "Emri i puntorit"
                          : "Komenti"}
                      </span>
                      <input
                        type="text"
                        placeholder={
                          form.category === "rroga"
                            ? "p.sh. Andi — rroga e korrikut"
                            : "p.sh. fatura e muajit korrik"
                        }
                        value={form.note}
                        onChange={(e) => setField("note", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveExpense();
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      className="rpt-inline-save"
                      onClick={saveExpense}
                      disabled={busy}
                    >
                      <Plus size={15} strokeWidth={2.7} />
                      {busy ? "Duke ruajtur…" : "Shto"}
                    </button>
                  </div>

                  <div className="rpt-inline-foot">
                    {savedFlash ? (
                      <span className="ok">
                        <Check size={13} strokeWidth={3} /> {savedFlash}
                      </span>
                    ) : (
                      <span className="hint">
                        Forma mbetet e hapur — shto sa fatura të duash me radhë
                        (Enter për ruajtje të shpejtë).
                      </span>
                    )}
                  </div>

                  {error && <div className="rpt-error">{error}</div>}
                </div>
              )}

              {expenses.length > 0 && (
                <div className="rpt-catsplit">
                  {expByCategory.map((c) => {
                    const CatIcon = c.Icon;
                    const pct =
                      maxCatTotal > 0 ? (c.total / maxCatTotal) * 100 : 0;
                    const share =
                      expTotal > 0 ? (c.total / expTotal) * 100 : 0;

                    return (
                      <div key={c.id} className="rpt-catsplit-row">
                        <span className="rpt-catsplit-name">
                          <CatIcon size={14} strokeWidth={2.3} />
                          {c.label}
                        </span>

                        <span className="rpt-catsplit-bar">
                          <span style={{ width: `${pct}%` }} />
                        </span>

                        <b>{money(c.total)} ALL</b>
                        <i>{share.toFixed(1)}%</i>
                      </div>
                    );
                  })}
                </div>
              )}

              {expenses.length === 0 ? (
                <div className="rpt-empty small">
                  Nuk ka shpenzime të regjistruara për këtë periudhë.
                </div>
              ) : (
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Kategoria</th>
                      <th>Komenti</th>
                      <th className="num">Shuma (ALL)</th>
                      {!isLocked && <th className="rpt-no-print" />}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => {
                      const meta = catMeta(exp.category);
                      const CatIcon = meta.Icon;

                      return (
                        <tr key={exp._id}>
                          <td>{fmtDate(exp.date)}</td>
                          <td>
                            <span className="rpt-cat">
                              <CatIcon size={13} strokeWidth={2.4} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="rpt-note">{exp.note || "—"}</td>
                          <td className="num">−{money(exp.amount)}</td>
                          {!isLocked && (
                            <td className="rpt-no-print rpt-del-cell">
                              <button
                                type="button"
                                onClick={() => removeExpense(exp)}
                                aria-label="Fshi"
                              >
                                <Trash2 size={14} strokeWidth={2.3} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Totali i shpenzimeve</td>
                      <td className="num">−{money(expTotal)}</td>
                      {!isLocked && <td className="rpt-no-print" />}
                    </tr>
                  </tfoot>
                </table>
              )}
            </section>

            {/* FITIMI */}
            <section className={`rpt-final ${profit < 0 ? "neg" : ""}`}>
              <div className="rpt-final-row">
                <span>Xhiroja totale</span>
                <b>{money(revenue)} ALL</b>
              </div>
              <div className="rpt-final-row">
                <span>Shpenzimet</span>
                <b>−{money(expTotal)} ALL</b>
              </div>
              <div className="rpt-final-row big">
                <span>FITIMI NETO</span>
                <b>
                  {profit < 0 ? "−" : ""}
                  {money(Math.abs(profit))} ALL
                </b>
              </div>
            </section>

            <footer className="rpt-doc-foot">
              Gjeneruar nga MyOrder · {printMeta.date} {printMeta.time}
              {isLocked && " · Periudhë e mbyllur"}
            </footer>
          </div>
        )}

        {/* ============ DOKUMENTI I PRINTIMIT (3 faqe A4) ============ */}
        {!loading && (
          <div className="rpt-print-doc">
            {/* -------- FAQE 1 -------- */}
            <section className="rpt-a4">
              <header className="rpt-a4-head">
                <div>
                  <h1>MYORDER</h1>
                  <h2>RAPORT FINANCIAR</h2>
                </div>
                <div className="rpt-a4-meta">
                  <span>Data: {printMeta.date}</span>
                  <span>Ora: {printMeta.time}</span>
                  <span>Faqe: 1 nga 3</span>
                </div>
              </header>

              <p className="rpt-a4-period">
                {businessName ? `${businessName} · ` : ""}Periudha:{" "}
                {periodLabel}
                {isLocked ? " (e mbyllur)" : ""}
              </p>

              <h3 className="rpt-a4-title">PËRMBLEDHJE</h3>
              <table className="rpt-a4-table plain">
                <tbody>
                  <tr>
                    <td>XHIRO TOTALE</td>
                    <td className="num">{money2(revenue)} ALL</td>
                  </tr>
                  <tr>
                    <td>SHPENZIME TOTALE</td>
                    <td className="num">{money2(expTotal)} ALL</td>
                  </tr>
                  <tr className="strong">
                    <td>FITIM NETO</td>
                    <td className="num">
                      {profit < 0 ? "−" : ""}
                      {money2(Math.abs(profit))} ALL
                    </td>
                  </tr>
                </tbody>
              </table>

              <h3 className="rpt-a4-title">XHIRO SIPAS KATEGORISË</h3>
              <table className="rpt-a4-table plain">
                <tbody>
                  <tr>
                    <td>RESTORANT</td>
                    <td className="num">{money2(catSplit.rest.revenue)} ALL</td>
                    <td className="num pct">{catSplit.restPct.toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>BAR</td>
                    <td className="num">{money2(catSplit.bar.revenue)} ALL</td>
                    <td className="num pct">{catSplit.barPct.toFixed(1)}%</td>
                  </tr>
                  <tr className="strong">
                    <td>XHIRO TOTALE</td>
                    <td className="num">{money2(revenue)} ALL</td>
                    <td className="num pct">100.0%</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="rpt-a4-title">SHPENZIMET SIPAS KATEGORISË</h3>
              {expenses.length === 0 ? (
                <p className="rpt-a4-none">
                  Nuk ka shpenzime për këtë periudhë.
                </p>
              ) : (
                <table className="rpt-a4-table">
                  <thead>
                    <tr>
                      <th>KATEGORIA</th>
                      <th className="num">FATURA</th>
                      <th className="num">VLERA (ALL)</th>
                      <th className="num pct">PESHA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expByCategory.map((c) => (
                      <tr key={`p1-cat-${c.id}`}>
                        <td>{c.label.toUpperCase()}</td>
                        <td className="num">{c.items.length}</td>
                        <td className="num">{money2(c.total)}</td>
                        <td className="num pct">
                          {expTotal > 0
                            ? ((c.total / expTotal) * 100).toFixed(1)
                            : "0.0"}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>TOTALI I SHPENZIMEVE</td>
                      <td className="num">{expenses.length}</td>
                      <td className="num">{money2(expTotal)}</td>
                      <td className="num pct">100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              <h3 className="rpt-a4-title">TREGUESIT KRYESORË</h3>
              <table className="rpt-a4-table plain">
                <tbody>
                  <tr>
                    <td>POROSI TOTALE</td>
                    <td className="num">{orders.toLocaleString("sq-AL")}</td>
                  </tr>
                  <tr>
                    <td>MESATARJA PËR POROSI</td>
                    <td className="num">{money2(avgPerOrder)} ALL</td>
                  </tr>
                  <tr>
                    <td>ÇMIMI MESATAR RESTORANT</td>
                    <td className="num">{money2(avgRest)} ALL</td>
                  </tr>
                  <tr>
                    <td>ÇMIMI MESATAR BAR</td>
                    <td className="num">{money2(avgBar)} ALL</td>
                  </tr>
                </tbody>
              </table>

              <footer className="rpt-a4-foot">
                <span>MYORDER — Raport Financiar</span>
                <span>Faleminderit!</span>
              </footer>
            </section>

            {/* -------- FAQE 2 -------- */}
            <section className="rpt-a4">
              <header className="rpt-a4-head">
                <div>
                  <h1>MYORDER</h1>
                  <h2>DETAJE TË SHITJEVE (SIPAS PRODUKTEVE)</h2>
                </div>
                <div className="rpt-a4-meta">
                  <span>Data: {printMeta.date}</span>
                  <span>Ora: {printMeta.time}</span>
                  <span>Faqe: 2 nga 3</span>
                </div>
              </header>

              <p className="rpt-a4-period">Periudha: {periodLabel}</p>

              {products.length === 0 ? (
                <p className="rpt-a4-none">Nuk ka shitje për këtë periudhë.</p>
              ) : (
                <table className="rpt-a4-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>PRODUKTI</th>
                      <th>KATEGORIA</th>
                      <th>NJËSIA</th>
                      <th className="num">SASIA</th>
                      <th className="num">ÇMIMI MESATAR</th>
                      <th className="num">VLERA TOTALE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={`p2-${p.name}-${i}`}>
                        <td>{i + 1}</td>
                        <td>{p.name}</td>
                        <td>{p.type === "pije" ? "Pije" : "Ushqim"}</td>
                        <td>{p.type === "pije" ? "copë" : "porcion"}</td>
                        <td className="num">{money(p.qty)}</td>
                        <td className="num">
                          {p.qty > 0 ? money2(p.revenue / p.qty) : "0.00"}
                        </td>
                        <td className="num">{money2(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}>TOTALE</td>
                      <td className="num">{money(totalQty)}</td>
                      <td />
                      <td className="num">{money2(revenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              <footer className="rpt-a4-foot">
                <span>MYORDER — Detaje të Shitjeve</span>
                <span>Faqe 2 nga 3</span>
              </footer>
            </section>

            {/* -------- FAQE 3 -------- */}
            <section className="rpt-a4">
              <header className="rpt-a4-head">
                <div>
                  <h1>MYORDER</h1>
                  <h2>DETAJE TË SHPENZIMEVE</h2>
                </div>
                <div className="rpt-a4-meta">
                  <span>Data: {printMeta.date}</span>
                  <span>Ora: {printMeta.time}</span>
                  <span>Faqe: 3 nga 3</span>
                </div>
              </header>

              <p className="rpt-a4-period">Periudha: {periodLabel}</p>

              {expenses.length === 0 ? (
                <p className="rpt-a4-none">
                  Nuk ka shpenzime të regjistruara për këtë periudhë.
                </p>
              ) : (
                <table className="rpt-a4-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>DATA</th>
                      <th>KOMENT</th>
                      <th className="num">VLERA (ALL)</th>
                    </tr>
                  </thead>

                  {expByCategory.map((c) => (
                    <tbody key={`p3-grp-${c.id}`} className="rpt-a4-group">
                      <tr className="rpt-a4-group-head">
                        <td colSpan={4}>{c.label.toUpperCase()}</td>
                      </tr>

                      {c.items.map((exp, i) => (
                        <tr key={`p3-${exp._id}`}>
                          <td>{i + 1}</td>
                          <td>{fmtDate(exp.date)}</td>
                          <td>{exp.note || "—"}</td>
                          <td className="num">{money2(exp.amount)}</td>
                        </tr>
                      ))}

                      <tr className="rpt-a4-subtotal">
                        <td colSpan={3}>Nëntotali — {c.label}</td>
                        <td className="num">{money2(c.total)}</td>
                      </tr>
                    </tbody>
                  ))}

                  <tfoot>
                    <tr>
                      <td colSpan={3}>TOTALE I SHPENZIMEVE</td>
                      <td className="num">{money2(expTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              <footer className="rpt-a4-foot">
                <span>MYORDER — Detaje të Shpenzimeve</span>
                <span>Faqe 3 nga 3</span>
              </footer>
            </section>
          </div>
        )}
      </div>

      {/* ============ MODAL: KONFIRMO MBYLLJEN ============ */}
      {showCloseConfirm && (
        <>
          <div
            className="rpt-modal-overlay rpt-no-print"
            onClick={() => setShowCloseConfirm(false)}
          />

          <div className="rpt-modal rpt-no-print">
            <div className="rpt-modal-grip" />

            <div className="rpt-modal-head">
              <h3>Mbyll {periodLabel}?</h3>
              <button
                type="button"
                className="rpt-close"
                onClick={() => setShowCloseConfirm(false)}
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="rpt-warn">
              <AlertTriangle size={18} strokeWidth={2.4} />
              <p>
                Pas mbylljes, shpenzimet e kësaj periudhe <b>nuk mund të
                shtohen apo fshihen më</b>. Raporti do të mbetet vetëm për
                shikim dhe printim. Ky veprim mund të rikthehet vetëm nga
                administratori.
              </p>
            </div>

            <div className="rpt-confirm-figures">
              <div>
                <em>Xhiroja</em>
                <b>{money(revenue)} ALL</b>
              </div>
              <div>
                <em>Shpenzimet</em>
                <b>−{money(expTotal)} ALL</b>
              </div>
              <div className="profit">
                <em>Fitimi neto</em>
                <b>
                  {profit < 0 ? "−" : ""}
                  {money(Math.abs(profit))} ALL
                </b>
              </div>
            </div>

            {error && <div className="rpt-error">{error}</div>}

            <div className="rpt-modal-foot">
              <button
                type="button"
                className="rpt-btn ghost"
                onClick={() => setShowCloseConfirm(false)}
              >
                Anulo
              </button>

              <button
                type="button"
                className="rpt-btn danger"
                onClick={confirmClose}
                disabled={busy}
              >
                <LockKeyhole size={16} strokeWidth={2.4} />
                {busy ? "Duke mbyllur…" : `Mbyll ${periodLabel}`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}