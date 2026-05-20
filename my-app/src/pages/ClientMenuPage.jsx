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

const dict = {
  sq: {
    subtitle: "Zbulo ushqimet dhe pijet tona",
    syncing: "Po përditësohet",
    loading: "Duke ngarkuar menunë...",
    invalidQR: "Nuk u gjet biznesi. QR është i pavlefshëm.",
    loadError: "Gabim gjatë ngarkimit të menysë.",
    cantLoad: "Nuk mund të ngarkoj menunë.",
    emptyProductsTitle: "S’u gjet asnjë produkt",
    emptyProductsSub: "Provo Bar ose Restaurant.",
    bar: "Bar",
    restaurant: "Restaurant",
  },
  en: {
    subtitle: "Discover our delicious food and drinks",
    syncing: "Updating",
    loading: "Loading menu...",
    invalidQR: "Business not found. Invalid QR.",
    loadError: "Error while loading the menu.",
    cantLoad: "Unable to load the menu.",
    emptyProductsTitle: "No products found",
    emptyProductsSub: "Try Bar or Restaurant.",
    bar: "Bar",
    restaurant: "Restaurant",
  },
  it: {
    subtitle: "Scopri il nostro cibo e le nostre bevande",
    syncing: "Aggiornamento",
    loading: "Caricamento menù...",
    invalidQR: "Attività non trovata. QR non valido.",
    loadError: "Errore durante il caricamento del menù.",
    cantLoad: "Impossibile caricare il menù.",
    emptyProductsTitle: "Nessun prodotto trovato",
    emptyProductsSub: "Prova Bar o Ristorante.",
    bar: "Bar",
    restaurant: "Restaurant",
  },
};

function normalizeLang(x) {
  const v = String(x || "").toLowerCase().trim();
  return ["sq", "en", "it"].includes(v) ? v : "sq";
}

const norm = (v) => String(v || "").trim().toLowerCase();

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

const pickSubCategoryName = (p, lang) => {
  const sq = String(
    p?.subCategoryId?.nameSq ||
    p?.subCategoryNameSq ||
    p?.subCategoryName ||
    p?.subCategory ||
    ""
  ).trim();

  const en = String(
    p?.subCategoryId?.nameEn ||
    p?.subCategoryNameEn ||
    ""
  ).trim();

  const it = String(
    p?.subCategoryId?.nameIt ||
    p?.subCategoryNameIt ||
    ""
  ).trim();

  if (lang === "en") return en || sq;
  if (lang === "it") return it || en || sq;

  return sq || en || it;
};

const getProductImage = (p) => p?.imageUrl || p?.image || p?.photoUrl || "";

const productMenuType = (p) => {
  const categoryType = norm(p?.categoryType);
  const destination = norm(p?.destination);

  if (categoryType === "pije" || categoryType === "bar" || destination === "banak") {
    return "pije";
  }

  if (
    categoryType === "ushqime" ||
    categoryType === "restorant" ||
    categoryType === "restaurant" ||
    destination === "kuzhine" ||
    destination === "kuzhinë"
  ) {
    return "ushqime";
  }

  return "pije";
};

function renderCategorySection(cat, items, lang) {
  return (
    <section key={cat} className="cm-section">
      <div className="cm-section-head">
        <div className="cm-section-title-wrap">
          <span className="cm-section-icon">◎</span>
          <h2 className="cm-section-title">{cat}</h2>
        </div>
      </div>

      <div className="cm-grid">
        {items.map((p) => {
          const title = pickName(p, lang);
          const desc = pickDesc(p, lang);
          const price = Number(p?.price || 0).toFixed(2);
          const img = getProductImage(p);

          return (
            <article key={p._id} className="cm-card">
              {img ? (
                <img className="cm-img" src={img} alt={title} loading="lazy" />
              ) : (
                <div className="cm-img cm-img-placeholder" />
              )}

              <div className="cm-card-overlay">
                <h3 className="cm-name">{title}</h3>
                {desc ? <p className="cm-desc">{desc}</p> : null}
                <div className="cm-price">{price} ALL</div>
              </div>
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
  const [menuType, setMenuType] = useState("pije");

  const syncTimerRef = useRef(null);
  const t = useMemo(() => dict[lang] || dict.sq, [lang]);

  useEffect(() => {
    if (urlLang) setLang(urlLang);
  }, [urlLang]);

  useEffect(() => {
    localStorage.setItem("lang", lang);

    try {
      const u = new URL(window.location.href);
      u.searchParams.set("lang", lang);
      window.history.replaceState({}, "", u.toString());
    } catch {
      //
    }
  }, [lang]);

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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => productMenuType(p) === menuType);
  }, [products, menuType]);

  const groupedByCategory = useMemo(() => {
    const groups = {};

    for (const p of filteredProducts) {
      const rawCat =
  pickSubCategoryName(p, lang) ||
  p?.category ||
  "Other";
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
  }, [filteredProducts, lang]);

  const filteredCategoryKeys = useMemo(() => {
    return Object.keys(groupedByCategory).sort((a, b) => a.localeCompare(b));
  }, [groupedByCategory]);

  const hasResults = filteredCategoryKeys.length > 0;

  if (loading) return <div className="cm-loading">{t.loading}</div>;
  if (error) return <div className="cm-error">{error}</div>;

  return (
    <div className="cm-page" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="cm-overlay" />

      <header className="cm-header">
        <div className="cm-nav clean">
          <div />

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
        </div>

        <div className="cm-hero">
          <h1 className="cm-title luxury">
            <span className="cm-title-script">Welcome</span>
            <span className="cm-title-small">TO OUR</span>
            <span className="cm-title-main">MENU</span>
          </h1>

          <div className="cm-ornament" />

          <p className="cm-subtitle">{syncing ? t.syncing : t.subtitle}</p>
        </div>

        <div className="cm-menu-type segmented">
          <button
            type="button"
            className={`cm-menu-type-btn ${menuType === "pije" ? "active" : ""}`}
            onClick={() => setMenuType("pije")}
          >
            <span></span>
            {t.bar}
          </button>

          <button
            type="button"
            className={`cm-menu-type-btn ${menuType === "ushqime" ? "active" : ""}`}
            onClick={() => setMenuType("ushqime")}
          >
            <span></span>
            {t.restaurant}
          </button>
        </div>
      </header>

      <main className="cm-content">
        {!hasResults ? (
          <div className="cm-empty">
            <div className="cm-empty-title">{t.emptyProductsTitle}</div>
            <div className="cm-empty-sub">{t.emptyProductsSub}</div>
          </div>
        ) : (
          filteredCategoryKeys.map((cat) =>
            renderCategorySection(cat, groupedByCategory[cat], lang)
          )
        )}
      </main>
    </div>
  );
}