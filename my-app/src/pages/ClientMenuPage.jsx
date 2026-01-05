// src/pages/ClientMenuPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./ClientMenuPage.css";
import { socket } from "../realtime/socket.js";
import { api } from "../api/http.js";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

/* =========================
   i18n (SQ / EN / IT)
========================= */
const LANGS = [
  { code: "sq", label: "Shqip" },
  { code: "en", label: "English" },
  { code: "it", label: "Italiano" },
];

const dict = {
  sq: {
    menu: "Menu",
    pricesAuto: "Çmimet përditësohen automatikisht",
    syncing: "• Po përditësohet…",
    searchPlaceholder: "Kërko produkt…",
    searchAria: "Kërko produkt",
    clear: "Pastro",
    all: "Të gjitha",
    loading: "Duke ngarkuar menunë…",
    invalidQR: "Nuk u gjet biznesi. QR është i pavlefshëm.",
    loadError: "Gabim gjatë ngarkimit të menysë.",
    cantLoad: "Nuk mund të ngarkoj menunë.",
    emptyTitle: "S’u gjet asnjë produkt",
    emptySub: "Provo një kërkim tjetër ose ndrysho kategorinë.",
    items: "artikuj",
    tip: "Tip: Nëse menaxheri ndryshon çmime/produkte, kjo faqe përditësohet vetë ✅",
    categories: "Kategoritë",
    language: "Gjuha",
  },
  en: {
    menu: "Menu",
    pricesAuto: "Prices update automatically",
    syncing: "• Updating…",
    searchPlaceholder: "Search product…",
    searchAria: "Search product",
    clear: "Clear",
    all: "All",
    loading: "Loading menu…",
    invalidQR: "Business not found. Invalid QR.",
    loadError: "Error while loading the menu.",
    cantLoad: "Unable to load the menu.",
    emptyTitle: "No products found",
    emptySub: "Try another search or change category.",
    items: "items",
    tip: "Tip: If the manager changes prices/products, this page updates automatically ✅",
    categories: "Categories",
    language: "Language",
  },
  it: {
    menu: "Menù",
    pricesAuto: "I prezzi si aggiornano automaticamente",
    syncing: "• Aggiornamento…",
    searchPlaceholder: "Cerca prodotto…",
    searchAria: "Cerca prodotto",
    clear: "Pulisci",
    all: "Tutti",
    loading: "Caricamento menù…",
    invalidQR: "Attività non trovata. QR non valido.",
    loadError: "Errore durante il caricamento del menù.",
    cantLoad: "Impossibile caricare il menù.",
    emptyTitle: "Nessun prodotto trovato",
    emptySub: "Prova un’altra ricerca o cambia categoria.",
    items: "articoli",
    tip: "Suggerimento: se il manager cambia prezzi/prodotti, questa pagina si aggiorna automaticamente ✅",
    categories: "Categorie",
    language: "Lingua",
  },
};

function normalizeLang(x) {
  const v = String(x || "").toLowerCase().trim();
  return ["sq", "en", "it"].includes(v) ? v : "sq";
}

export default function ClientMenuPage() {
  const query = useQuery();
  const businessId = (query.get("businessId") || "").trim();

  // ✅ gjuha: URL -> localStorage -> default sq
  const urlLang = normalizeLang(query.get("lang"));
  const storedLang = normalizeLang(localStorage.getItem("lang"));
  const [lang, setLang] = useState(urlLang || storedLang || "sq");

  // mbaje të sinkronizuar me URL nëse ndryshon
  useEffect(() => {
    if (urlLang && urlLang !== lang) setLang(urlLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLang]);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const t = useMemo(() => dict[lang] || dict.sq, [lang]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true); // load fillestar
  const [syncing, setSyncing] = useState(false); // update në background
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState(t.all);

  // debounce për socket eventet
  const syncTimerRef = useRef(null);

  const fetchProducts = useCallback(
    async ({ showLoading = false } = {}) => {
      if (!businessId) return;

      try {
        if (showLoading) setLoading(true);
        else setSyncing(true);

        if (showLoading) setError("");

        const res = await api.get("/products", {
          params: { businessId },
          headers: { "Cache-Control": "no-cache" },
        });

        const data = res?.data;

        if (!Array.isArray(data)) {
          if (showLoading) setError(t.cantLoad);
          return;
        }

        setProducts(data);
      } catch (err) {
        console.error("ClientMenuPage fetchProducts:", err?.response?.data || err);
        if (showLoading) setError(t.loadError);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [businessId, t.cantLoad, t.loadError]
  );

  // load fillestar
  useEffect(() => {
    if (!businessId) {
      setError(t.invalidQR);
      setLoading(false);
      return;
    }
    fetchProducts({ showLoading: true });
  }, [businessId, fetchProducts, t.invalidQR]);

  // real-time
  useEffect(() => {
    if (!businessId) return;

    const join = () => socket.emit("joinBusiness", businessId);

    if (socket.connected) join();
    socket.on("connect", join);

    const onProductsChanged = (payload) => {
      if (payload?.businessId && String(payload.businessId) !== String(businessId)) return;

      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        fetchProducts({ showLoading: false });
      }, 250);
    };

    socket.on("products:changed", onProductsChanged);

    return () => {
      socket.off("connect", join);
      socket.off("products:changed", onProductsChanged);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [businessId, fetchProducts]);

  // grupim sipas subCategory
  const groupedByCategory = useMemo(() => {
    const groups = {};

    for (const p of products) {
      const rawCat = p?.subCategoryName ?? p?.subCategory ?? p?.category ?? "Other";
      const cat = String(rawCat || "Other").trim() || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }

    Object.keys(groups).forEach((k) => {
      groups[k] = groups[k]
        .slice()
        .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
    });

    return groups;
  }, [products]);

  const categories = useMemo(() => {
    const keys = Object.keys(groupedByCategory).sort((a, b) => a.localeCompare(b));
    return [t.all, ...keys];
  }, [groupedByCategory, t.all]);

  // kur ndërron gjuhën, sigurohu që activeCat është valid
  useEffect(() => {
    // nëse activeCat ishte "Të gjitha" dhe tani është p.sh. "All", e kthejmë te t.all
    if (!categories.includes(activeCat)) setActiveCat(t.all);
  }, [categories, activeCat, t.all]);

  const filteredGrouped = useMemo(() => {
    const q = search.trim().toLowerCase();

    const pickCats = activeCat === t.all ? Object.keys(groupedByCategory) : [activeCat];

    const out = {};
    for (const cat of pickCats) {
      const arr = groupedByCategory[cat] || [];
      const filtered = !q
        ? arr
        : arr.filter((p) => String(p?.name || "").toLowerCase().includes(q));
      if (filtered.length) out[cat] = filtered;
    }
    return out;
  }, [groupedByCategory, search, activeCat, t.all]);

  const hasResults = Object.keys(filteredGrouped).length > 0;

  if (loading) return <div className="cm-loading">{t.loading}</div>;
  if (error) return <div className="cm-error">{error}</div>;

  return (
    <div className="cm-page">
      {/* HEADER sticky */}
      <div className="cm-header">
        <div className="cm-header-inner">
          <div className="cm-brand">
            <div className="cm-title">{t.menu}</div>
            <div className="cm-subtitle">
              {t.pricesAuto}
              {syncing ? <span className="cm-sync">{t.syncing}</span> : null}
            </div>
          </div>

          {/* LANGUAGE SELECTOR */}
          <div className="cm-lang">
            <label className="cm-lang-label" htmlFor="langSelect">
              {t.language}
            </label>
            <select
              id="langSelect"
              className="cm-lang-select"
              value={lang}
              onChange={(e) => setLang(normalizeLang(e.target.value))}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="cm-search">
            <span className="cm-search-icon">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchAria}
            />
            {search ? (
              <button
                type="button"
                className="cm-clear"
                onClick={() => setSearch("")}
                aria-label={t.clear}
              >
                ✕
              </button>
            ) : null}
          </div>

          <div className="cm-chips" role="tablist" aria-label={t.categories}>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`cm-chip ${activeCat === c ? "active" : ""}`}
                onClick={() => {
                  setActiveCat(c);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="cm-content">
        {!hasResults ? (
          <div className="cm-empty">
            <div className="cm-empty-title">{t.emptyTitle}</div>
            <div className="cm-empty-sub">{t.emptySub}</div>
          </div>
        ) : (
          Object.keys(filteredGrouped).map((cat) => (
            <section key={cat} className="cm-section" id={`cat-${cat}`}>
              <div className="cm-section-head">
                <div className="cm-section-title">{cat}</div>
                <div className="cm-section-count">
                  {filteredGrouped[cat].length} {t.items}
                </div>
              </div>

              <div className="cm-grid">
                {filteredGrouped[cat].map((p) => (
                  <article key={p._id} className="cm-card">
                    <div className="cm-card-top">
                      <div className="cm-name">{p.name}</div>
                      <div className="cm-price">
                        {Number(p.price || 0).toFixed(2)} €
                      </div>
                    </div>

                    {p.description ? (
                      <div className="cm-desc">{p.description}</div>
                    ) : (
                      <div className="cm-desc muted"> </div>
                    )}

                    {p.imageUrl ? (
                      <div className="cm-imgWrap">
                        <img className="cm-img" src={p.imageUrl} alt={p.name} loading="lazy" />
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))
        )}

        <div className="cm-footerNote">{t.tip}</div>
      </div>
    </div>
  );
}
