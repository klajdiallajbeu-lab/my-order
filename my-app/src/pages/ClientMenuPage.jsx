import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./ClientMenuPage.css";
import { socket } from "../realtime/socket.js";
import { api } from "../api/http.js";
import bgImage from "../assets/restorant.webp";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

/* =========================
   i18n (SQ / EN / IT)
========================= */
const dict = {
  sq: {
    menu: "Miresevini ne menunë tonë",
    syncing: "Po përditësohet",
    loading: "Duke ngarkuar menunë...",
    invalidQR: "Nuk u gjet biznesi. QR është i pavlefshëm.",
    loadError: "Gabim gjatë ngarkimit të menysë.",
    cantLoad: "Nuk mund të ngarkoj menunë.",
    emptyTitle: "Zgjidh Bar ose Restorant",
    emptySub: "Pasi të zgjedhësh njërën, do të shfaqen kategoritë dhe produktet.",
    emptyProductsTitle: "S’u gjet asnjë produkt",
    emptyProductsSub: "Provo një kategori tjetër.",
    items: "artikuj",
    categories: "Kategoritë",
    noDesc: "Pa përshkrim",
    bar: "Bar",
    restaurant: "Restorant",
    menuType: "Zgjidh menunë",
  },
  en: {
    menu: "Welcome to our menu",
    syncing: "Updating",
    loading: "Loading menu...",
    invalidQR: "Business not found. Invalid QR.",
    loadError: "Error while loading the menu.",
    cantLoad: "Unable to load the menu.",
    emptyTitle: "Choose Bar or Restaurant",
    emptySub: "After choosing one, categories and products will appear.",
    emptyProductsTitle: "No products found",
    emptyProductsSub: "Try another category.",
    items: "items",
    categories: "Categories",
    noDesc: "No description",
    bar: "Bar",
    restaurant: "Restaurant",
    menuType: "Choose menu",
  },
  it: {
    menu: "Benvenuto nel nostro menù",
    syncing: "Aggiornamento",
    loading: "Caricamento menù...",
    invalidQR: "Attività non trovata. QR non valido.",
    loadError: "Errore durante il caricamento del menù.",
    cantLoad: "Impossibile caricare il menù.",
    emptyTitle: "Scegli Bar o Ristorante",
    emptySub: "Dopo la scelta appariranno categorie e prodotti.",
    emptyProductsTitle: "Nessun prodotto trovato",
    emptyProductsSub: "Prova un’altra categoria.",
    items: "articoli",
    categories: "Categorie",
    noDesc: "Nessuna descrizione",
    bar: "Bar",
    restaurant: "Ristorante",
    menuType: "Scegli il menù",
  },
};

function normalizeLang(x) {
  const v = String(x || "").toLowerCase().trim();
  return ["sq", "en", "it"].includes(v) ? v : "sq";
}

const pickName = (p, lang) => {
  const sq = String(p?.nameSq ?? p?.name ?? "").trim();
  const en = String(p?.nameEn ?? "").trim();
  const it = String(p?.nameIt ?? "").trim();

  if (lang === "it") return it || en || sq;
  if (lang === "en") return en || it || sq;
  return sq || en || it;
};

const pickDesc = (p, lang) => {
  const sq = String(p?.descSq ?? p?.description ?? "").trim();
  const en = String(p?.descEn ?? "").trim();
  const it = String(p?.descIt ?? "").trim();

  if (lang === "it") return it || en || sq;
  if (lang === "en") return en || it || sq;
  return sq || en || it;
};

const BAR_CATEGORIES = [
  "BIRRA",
  "BIRA",
  "ALKOLIKE",
  "ALKOOLIKE",
  "KAFE",
  "PIJE",
  "PIJE TE FTOHTA",
  "PIJE TË FTOHTA",
  "KOKTEJ",
  "COCKTAIL",
  "VERA",
  "WINE",
  "LIKER",
  "LIKERË",
  "LIKERET",
  "FRAPE",
  "SMOOTHIE",
  "FRESH",
  "CAJ",
  "ÇAJ",
  "TE NGROHTA",
  "TË NGROHTA",
];

const RESTAURANT_CATEGORIES = [
  "PASTA",
  "PICA",
  "PIZZA",
  "RISOTO",
  "SUPA",
  "SALLATA",
  "SALLATË",
  "MISH",
  "SEAFOOD",
  "OMELET",
  "BREAKFAST",
  "MENGJES",
  "MËNGJES",
  "BURGER",
  "SANDWICH",
  "SENDVIÇ",
  "SENDEVIC",
  "MAKARONA",
  "ORIZ",
  "DESERT",
  "DESSERT",
  "EMBELSIRA",
  "ËMBËLSIRA",
  "AKULLORE",
  "ICE CREAM",
];

function normalizeCategoryName(cat) {
  return String(cat || "").trim().toUpperCase();
}

function isBarCategory(cat) {
  return BAR_CATEGORIES.includes(normalizeCategoryName(cat));
}

function isRestaurantCategory(cat) {
  return RESTAURANT_CATEGORIES.includes(normalizeCategoryName(cat));
}

function renderCategorySection(cat, items, lang, t) {
  return (
    <section key={cat} className="cm-section">
      <div className="cm-section-head">
        <div className="cm-section-title-wrap">
          <span className="cm-section-bar" />
          <h2 className="cm-section-title">{cat}</h2>
        </div>

        <div className="cm-section-count">
          {items.length} {t.items}
        </div>
      </div>

      <div className="cm-grid">
        {items.map((p) => {
          const title = pickName(p, lang);
          const desc = pickDesc(p, lang);
          const price = Number(p?.price || 0).toFixed(2);

          return (
            <article key={p._id} className="cm-card">
              <div className="cm-card-top">
                <div className="cm-name-wrap">
                  <h3 className="cm-name">{title}</h3>
                </div>

                <div className="cm-price">{price} ALL</div>
              </div>

              {desc ? (
                <div className="cm-desc">{desc}</div>
              ) : (
                <div className="cm-desc muted">{t.noDesc}</div>
              )}

              {p.imageUrl ? (
                <div className="cm-imgWrap">
                  <img
                    className="cm-img"
                    src={p.imageUrl}
                    alt={title}
                    loading="lazy"
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function ClientMenuPage() {
  const query = useQuery();
  const businessId = (query.get("businessId") || "").trim();

  const urlLang = normalizeLang(query.get("lang"));
  const storedLang = normalizeLang(localStorage.getItem("lang"));

  const [lang, setLang] = useState(urlLang || storedLang || "sq");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const [menuType, setMenuType] = useState("");

  const syncTimerRef = useRef(null);

  useEffect(() => {
    if (urlLang) {
      setLang(urlLang);
    }
  }, [urlLang]);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("lang", lang);
      window.history.replaceState({}, "", u.toString());
    } catch {
      //
    }
  }, [lang]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setShowLang(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const t = useMemo(() => dict[lang] || dict.sq, [lang]);

  const fetchProducts = useCallback(
    async ({ showLoading = false } = {}) => {
      if (!businessId) return;

      try {
        if (showLoading) {
          setLoading(true);
          setError("");
        } else {
          setSyncing(true);
        }

        const res = await api.get("/products", {
          params: { businessId, hideNumbers: 1 },
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

  useEffect(() => {
    if (!businessId) {
      setError(t.invalidQR);
      setLoading(false);
      return;
    }

    fetchProducts({ showLoading: true });
  }, [businessId, fetchProducts, t.invalidQR]);

  useEffect(() => {
    if (!businessId) return;

    const join = () => socket.emit("joinBusiness", businessId);

    if (socket.connected) join();
    socket.on("connect", join);

    const onProductsChanged = (payload) => {
      if (payload?.businessId && String(payload.businessId) !== String(businessId)) {
        return;
      }

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

  const groupedByCategory = useMemo(() => {
    const groups = {};

    for (const p of products) {
      const rawCat = p?.subCategoryName ?? p?.subCategory ?? p?.category ?? "Other";
      const cat = String(rawCat || "Other").trim() || "Other";

      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }

    Object.keys(groups).forEach((key) => {
      groups[key] = groups[key]
        .slice()
        .sort((a, b) => pickName(a, lang).localeCompare(pickName(b, lang)));
    });

    return groups;
  }, [products, lang]);

  const allCategoryKeys = useMemo(() => {
    return Object.keys(groupedByCategory).sort((a, b) => a.localeCompare(b));
  }, [groupedByCategory]);

  const barKeys = useMemo(
    () => allCategoryKeys.filter((cat) => isBarCategory(cat)),
    [allCategoryKeys]
  );

  const restaurantKeys = useMemo(
    () => allCategoryKeys.filter((cat) => isRestaurantCategory(cat)),
    [allCategoryKeys]
  );

  const visibleCategoryKeys = useMemo(() => {
    if (menuType === "bar") return barKeys;
    if (menuType === "restaurant") return restaurantKeys;
    return [];
  }, [menuType, barKeys, restaurantKeys]);

  const categories = useMemo(() => {
    return visibleCategoryKeys;
  }, [visibleCategoryKeys]);

  useEffect(() => {
    setActiveCat("");
  }, [menuType]);

  useEffect(() => {
    if (!activeCat) return;

    if (!categories.includes(activeCat)) {
      setActiveCat("");
    }
  }, [activeCat, categories]);

  const filteredGrouped = useMemo(() => {
    if (!menuType) return {};

    const selectedCategories = activeCat ? [activeCat] : visibleCategoryKeys;
    const out = {};

    for (const cat of selectedCategories) {
      const arr = groupedByCategory[cat] || [];
      if (arr.length) out[cat] = arr;
    }

    return out;
  }, [groupedByCategory, activeCat, visibleCategoryKeys, menuType]);

  const filteredCategoryKeys = useMemo(
    () => Object.keys(filteredGrouped),
    [filteredGrouped]
  );

  const hasMenuSelected = !!menuType;
  const hasResults = filteredCategoryKeys.length > 0;

  if (loading) {
    return <div className="cm-loading">{t.loading}</div>;
  }

  if (error) {
    return <div className="cm-error">{error}</div>;
  }

  return (
    <div
      className="cm-page"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <header className="cm-header">
        <div className="cm-header-inner">
          <div className="cm-brand">
            <h1 className="cm-title">{t.menu}</h1>
            <p className="cm-subtitle">
              {syncing ? <span className="cm-sync">{t.syncing}</span> : null}
            </p>
          </div>

          <div className="cm-topbar">
            <div className="cm-lang-native">
  <span className="cm-lang-native-icon">🌐</span>

  <select
    className="cm-lang-native-select"
    value={lang}
    onChange={(e) => setLang(normalizeLang(e.target.value))}
    aria-label="Language"
  >
    <option value="sq">SQ</option>
    <option value="en">EN</option>
    <option value="it">IT</option>
  </select>
</div>

            <div className="cm-menu-type-label">{t.menuType}</div>

            <div className="cm-menu-type">
              <button
                type="button"
                className={`cm-menu-type-btn ${menuType === "bar" ? "active" : ""}`}
                onClick={() => setMenuType("bar")}
              >
                {t.bar}
              </button>

              <button
                type="button"
                className={`cm-menu-type-btn ${
                  menuType === "restaurant" ? "active" : ""
                }`}
                onClick={() => setMenuType("restaurant")}
              >
                {t.restaurant}
              </button>
            </div>

            {hasMenuSelected ? (
              <div className="cm-chips" role="tablist" aria-label={t.categories}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cm-chip ${activeCat === cat ? "active" : ""}`}
                    onClick={() => setActiveCat((prev) => (prev === cat ? "" : cat))}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="cm-content">
        {!hasMenuSelected ? (
          <div className="cm-empty">
            <div className="cm-empty-title">{t.emptyTitle}</div>
            <div className="cm-empty-sub">{t.emptySub}</div>
          </div>
        ) : !hasResults ? (
          <div className="cm-empty">
            <div className="cm-empty-title">{t.emptyProductsTitle}</div>
            <div className="cm-empty-sub">{t.emptyProductsSub}</div>
          </div>
        ) : (
          filteredCategoryKeys.map((cat) =>
            renderCategorySection(cat, filteredGrouped[cat], lang, t)
          )
        )}
      </main>
    </div>
  );
}