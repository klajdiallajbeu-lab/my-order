import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./ClientMenuPage.css";
import { socket } from "../realtime/socket.js";
import { api } from "../api/http.js";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const dict = {
  sq: {
    title: "Menu",
    subtitle: "Zbulo ushqimet dhe pijet tona",
    syncing: "Po përditësohet",
    loading: "Duke ngarkuar menunë...",
    invalidQR: "Nuk u gjet biznesi. QR është i pavlefshëm.",
    loadError: "Gabim gjatë ngarkimit të menysë.",
    cantLoad: "Nuk mund të ngarkoj menunë.",
    emptyProductsTitle: "S'u gjet asnjë produkt",
    emptyProductsSub: "Provo një kategori tjetër.",
    searchPlaceholder: "Kërko në menu...",
    all: "Të gjitha",
    bar: "Bar",
    restaurant: "Restaurant",
  },
  en: {
    title: "Menu",
    subtitle: "Discover our delicious food and drinks",
    syncing: "Updating",
    loading: "Loading menu...",
    invalidQR: "Business not found. Invalid QR.",
    loadError: "Error while loading the menu.",
    cantLoad: "Unable to load the menu.",
    emptyProductsTitle: "No products found",
    emptyProductsSub: "Try another category.",
    searchPlaceholder: "Search the menu...",
    all: "All",
    bar: "Bar",
    restaurant: "Restaurant",
  },
  it: {
    title: "Menù",
    subtitle: "Scopri il nostro cibo e le nostre bevande",
    syncing: "Aggiornamento",
    loading: "Caricamento menù...",
    invalidQR: "Attività non trovata. QR non valido.",
    loadError: "Errore durante il caricamento del menù.",
    cantLoad: "Impossibile caricare il menù.",
    emptyProductsTitle: "Nessun prodotto trovato",
    emptyProductsSub: "Prova un'altra categoria.",
    searchPlaceholder: "Cerca nel menù...",
    all: "Tutti",
    bar: "Bar",
    restaurant: "Ristorante",
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

// Thumbnail i vogël (gjenerohet nga backend-i me sharp) — përdoret gjithmonë
// për grid-in e klientit. Bie mbrapa te fotoja e plotë vetëm nëse produkti
// s'ka thumbnail (p.sh. produkte të vjetra, ngarkuar para se backend-i të
// fillonte të gjeneronte thumbnail).
const getProductThumb = (p) =>
  p?.thumbnail || p?.thumbnailUrl || p?.imageUrl || p?.image || p?.photoUrl || "";

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

// GET /api/business/:id/settings — merr emrin e biznesit (të njëjtin që
// shfaqet te ManagerPage tek "Emri i hotelit").
async function fetchBusinessName(businessId) {
  if (!businessId) return "";

  try {
    const res = await api.get(`/business/${businessId}/public-name`);
    const data = res?.data?.data ?? res?.data;

    return String(
      data?.hotelName ||
      data?.businessName ||
      data?.name ||
      ""
    ).trim();
  } catch (err) {
    console.error("fetchBusinessName:", err?.response?.data || err);
    return "";
  }
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

  const [activeCatId, setActiveCatId] = useState("all");
  const [search, setSearch] = useState("");

  const [businessName, setBusinessName] = useState("");

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

  useEffect(() => {
    if (!businessId) return;

    let cancelled = false;

    fetchBusinessName(businessId).then((name) => {
      if (!cancelled && name) setBusinessName(name);
    });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

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

  const filteredProducts = products;

  const groupedByCategory = useMemo(() => {
    const groups = {};

    for (const p of filteredProducts) {
      const rawCat = pickSubCategoryName(p, lang) || p?.category;
      const cat = String(rawCat || "").trim();

      if (!cat) continue;

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

  const categoryKeys = useMemo(() => {
    return Object.keys(groupedByCategory).sort((a, b) => a.localeCompare(b));
  }, [groupedByCategory]);

  useEffect(() => {
    if (activeCatId === "all") return;
    if (!categoryKeys.includes(activeCatId)) setActiveCatId("all");
  }, [categoryKeys, activeCatId]);

  const visibleProducts = useMemo(() => {
    const base =
      activeCatId === "all"
        ? filteredProducts.slice().sort((a, b) => pickName(a, lang).localeCompare(pickName(b, lang)))
        : groupedByCategory[activeCatId] || [];

    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((p) => pickName(p, lang).toLowerCase().includes(q));
  }, [activeCatId, filteredProducts, groupedByCategory, lang, search]);

  const hasResults = visibleProducts.length > 0;

  const handleCategoryPick = (cat) => {
    setActiveCatId(cat);
  };

  if (loading) {
    return <div className="client-order-loading">{t.loading}</div>;
  }

  if (error) {
    return (
      <div className="client-order-wrapper">
        <div className="client-order-fatal-card">
          <h2>{t.invalidQR}</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-order-wrapper modern-menu">
      {/* HEADER */}
      <header className="modern-menu-header">
        <div className="modern-top-row">
          <div className="modern-brand">
            <div className="modern-brand-name">{businessName || t.title}</div>
            <div className="modern-brand-subtitle">{syncing ? t.syncing : t.subtitle}</div>
          </div>
        </div>

        {/* SEARCH + LANGUAGE */}
        <div className="modern-search-language">
          <div className="modern-search-box">
            <span className="modern-search-icon">⌕</span>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
            />

            {search && (
              <button
                type="button"
                className="modern-clear-search"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="modern-language-switch">
            {["sq", "en", "it"].map((language) => (
              <button
                key={language}
                type="button"
                className={lang === language ? "active" : ""}
                onClick={() => setLang(language)}
              >
                {language.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* CATEGORIES */}
      <nav className="modern-categories">
        <button
          type="button"
          className={activeCatId === "all" ? "active" : ""}
          onClick={() => handleCategoryPick("all")}
        >
          {t.all}
        </button>

        {categoryKeys.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCatId === category ? "active" : ""}
            onClick={() => handleCategoryPick(category)}
          >
            {category}
          </button>
        ))}
      </nav>

      {/* PRODUCTS */}
      <main className="modern-products-area">
        {!hasResults ? (
          <div className="modern-empty">
            <div>{t.emptyProductsTitle}</div>
            <div className="modern-empty-sub">{t.emptyProductsSub}</div>
          </div>
        ) : (
          <div className="modern-products-grid">
            {visibleProducts.map((product) => {
              const title = pickName(product, lang);
              const desc = pickDesc(product, lang);
              const price = Number(product?.price || 0);
              const thumb = getProductThumb(product);
              const categoryName = pickSubCategoryName(product, lang) || product?.category || "";

              return (
                <article key={product._id} className="modern-product-card">
                  <div className="modern-product-image-wrap">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={title}
                        className="modern-product-image"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="modern-product-placeholder">
                        {title.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {categoryName && (
                      <span className="modern-product-category">{categoryName}</span>
                    )}
                  </div>

                  <div className="modern-product-content">
                    <h3>{title}</h3>

                    {desc ? <p>{desc}</p> : <p className="muted">&nbsp;</p>}

                    <div className="modern-product-footer">
                      <strong>
                        {price.toLocaleString("sq-AL", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ALL
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}