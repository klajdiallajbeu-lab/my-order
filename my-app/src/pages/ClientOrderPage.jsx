import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "./ClientOrderPage.css";
import { createOrder } from "../api/ordersApi.js";
import { socket } from "../realtime/socket.js";
import { api } from "../api/http.js";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const LANGS = ["sq", "en", "it"];

const dict = {
  sq: {
    invalidQR: "Nuk u gjet biznesi. QR është i pavlefshëm.",
    loadingMenu: "Duke ngarkuar menunë...",
    chooseAtLeastOne: "Zgjidhni të paktën një produkt.",
    orderSent: "Porosia u dërgua me sukses!",
    noProductsForFilter: "Nuk u gjet asnjë produkt për këtë filtër.",
    invoice: "Fatura",
    total: "Total",
  },
  en: {
    invalidQR: "Business not found. Invalid QR.",
    loadingMenu: "Loading menu...",
    chooseAtLeastOne: "Please choose at least one product.",
    orderSent: "Order sent successfully!",
    noProductsForFilter: "No products found for this filter.",
    invoice: "Invoice",
    total: "Total",
  },
  it: {
    invalidQR: "Attività non trovata. QR non valido.",
    loadingMenu: "Caricamento menù...",
    chooseAtLeastOne: "Seleziona almeno un prodotto.",
    orderSent: "Ordine inviato con successo!",
    noProductsForFilter: "Nessun prodotto trovato per questo filtro.",
    invoice: "Fattura",
    total: "Totale",
  },
};

function normalizeLang(x) {
  const v = String(x || "").toLowerCase().trim();
  return LANGS.includes(v) ? v : "";
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

const pickSubCategoryName = (p, lang) => {
  const sq = String(
    p?.subCategoryId?.nameSq ||
    p?.subCategoryNameSq ||
    p?.subCategoryName ||
    p?.subCategory ||
    p?.category ||
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

function FoodIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 3V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 10V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 3C17.2 5.3 17.2 8.7 15 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 11V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DrinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4H16L15 11C14.8 12.7 13.4 14 11.7 14H12.3C10.6 14 9.2 12.7 9 11L8 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 18H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 14H14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 14V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3H17V21L15 19.5L13 21L11 19.5L9 21L7 19.5L5 21V5C5 3.9 5.9 3 7 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 8H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 12H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function ClientOrderPage() {
  const { token, sessionToken } = useParams();
  const query = useQuery();

  const urlLang = normalizeLang(query.get("lang"));
  const storedLang = normalizeLang(
    typeof window !== "undefined" ? localStorage.getItem("lang") : ""
  );

  const [lang, setLang] = useState(urlLang || storedLang || "sq");
  const t = useCallback((key) => (dict[lang] || dict.sq)[key] || key, [lang]);

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

  const [place, setPlace] = useState(null);
  const [placeLoading, setPlaceLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [fatalError, setFatalError] = useState("");
  const [bannerError, setBannerError] = useState("");
  const [success, setSuccess] = useState("");

  const [lastOrder, setLastOrder] = useState(null);

  const [activeCatId, setActiveCatId] = useState("all");
  const [search, setSearch] = useState("");


  const [openMenuType, setOpenMenuType] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderNote, setOrderNote] = useState("");

  const businessId = place?.businessId ? String(place.businessId) : "";
  const locationType = place?.type || "";
  const locationCode = place?.codeNormalized || place?.code || "";

  const [businessName, setBusinessName] = useState("");

  // 1) nëse `place` (nga /api/places/by-token) e sjell tashmë emrin, e përdorim direkt
  const placeBusinessName = String(
    place?.businessName ||
    place?.hotelName ||
    place?.business?.name ||
    place?.business?.hotelName ||
    ""
  ).trim();

  useEffect(() => {
    if (placeBusinessName) {
      setBusinessName(placeBusinessName);
      return;
    }

    if (!businessId) return;

    let cancelled = false;

    fetchBusinessName(businessId).then((name) => {
      if (!cancelled && name) setBusinessName(name);
    });

    return () => {
      cancelled = true;
    };
  }, [businessId, placeBusinessName]);

  const locationLabel =
    locationType === "room"
      ? `Dhoma ${locationCode}`
      : locationType === "umbrella"
      ? `Çadra ${locationCode}`
      : locationCode
      ? `Lokacioni ${locationCode}`
      : t("invalidQR");

  const normalizedSourceType =
    locationType === "room"
      ? "dhoma"
      : locationType === "umbrella"
      ? "cadra"
      : "unknown";

  const clearTopMessages = () => {
    setBannerError("");
    setSuccess("");
  };


  const fetchPlace = useCallback(async () => {

    // ✅ nëse jemi në session mode (mos përdor QR më)
if (sessionToken) {
  const savedToken = sessionStorage.getItem("guestSessionToken");

  if (!savedToken || savedToken !== sessionToken) {
    setFatalError("Sesioni nuk është valid. Ju lutem skanoni përsëri QR.");
    setPlaceLoading(false);
    return;
  }

  const businessId = sessionStorage.getItem("guestBusinessId");
  const sourceType = sessionStorage.getItem("guestSourceType");
  const sourceNumber = sessionStorage.getItem("guestSourceNumber");

  if (!businessId || !sourceType || !sourceNumber) {
    setFatalError("Sesioni mungon. Ju lutem skanoni përsëri QR.");
    setPlaceLoading(false);
    return;
  }

  // vendos place manualisht pa backend
  setPlace({
    businessId,
    type: sourceType === "dhoma" ? "room" : "umbrella",
    code: sourceNumber,
  });

  setPlaceLoading(false);
  return;
}
    if (!token) {
      setFatalError(t("invalidQR"));
      setPlace(null);
      setPlaceLoading(false);
      return;
    }

    try {
      setPlaceLoading(true);
      setFatalError("");
      setBannerError("");

      const res = await fetch(`/api/places/by-token/${encodeURIComponent(token)}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        const msg = data?.message || t("invalidQR");
        setFatalError(msg);
        setPlace(null);
        return;
      }

const placeData = data?.place || data;

console.log("BY TOKEN RESPONSE:", data);
console.log("SESSION TOKEN FROM BACKEND:", data?.sessionToken);

setPlace(placeData);

if (data?.sessionToken) {
  sessionStorage.setItem("guestSessionToken", data.sessionToken);
  sessionStorage.setItem("guestSessionExpiresAt", data.expiresAt);
  sessionStorage.setItem("guestBusinessId", data.businessId);
  sessionStorage.setItem("guestSourceType", data.sourceType);
  sessionStorage.setItem("guestSourceNumber", data.sourceNumber);

  console.log("✅ TOKEN SAVED:", data.sessionToken);
} else {
  console.warn("❌ Nuk erdhi sessionToken nga backend");
}
// 🚀 redirect në session URL (mos përdor më token e QR)
if (data?.sessionToken) {
  window.history.replaceState(
    {},
    "",
    `/order-session/${data.sessionToken}`
  );
}

console.log(
  "👉 STORAGE TOKEN:",
  sessionStorage.getItem("guestSessionToken")
);
    } catch (err) {
      console.error("Gabim te fetchPlace:", err);
      setFatalError("Gabim gjatë komunikimit me serverin.");
      setPlace(null);
    } finally {
      setPlaceLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    fetchPlace();
  }, [fetchPlace]);

  const fetchProducts = useCallback(async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      setBannerError("");

      const url = `/api/products?businessId=${encodeURIComponent(businessId)}`;
      const res = await fetch(url, { cache: "no-store" });

      const data = await res.json().catch(() => null);

      if (!res.ok || !Array.isArray(data)) {
        const msg =
          data?.message ||
          `Nuk mund të ngarkoj produktet (status ${res.status}).`;
        setBannerError(msg);
        setProducts([]);
        return;
      }

      setProducts(data);
    } catch (err) {
      console.error("Gabim te ClientOrderPage:", err);
      setBannerError("Gabim gjatë komunikimit me serverin.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (!place) {
      setLoading(false);
      return;
    }

    if (!businessId || !locationType || !locationCode) {
      setFatalError(t("invalidQR"));
      setLoading(false);
      return;
    }

    fetchProducts();
  }, [place, businessId, locationType, locationCode, fetchProducts, t]);

  useEffect(() => {
    if (!businessId) return;

    const join = () => socket.emit("joinBusiness", businessId);

    if (socket.connected) join();
    socket.on("connect", join);

    const onProductsChanged = (payload) => {
      if (
        payload?.businessId &&
        String(payload.businessId) !== String(businessId)
      ) {
        return;
      }
      fetchProducts();
    };

    socket.on("products:changed", onProductsChanged);

    return () => {
      socket.off("connect", join);
      socket.off("products:changed", onProductsChanged);
    };
  }, [businessId, fetchProducts]);

  useEffect(() => {
    if (!Array.isArray(products)) return;

    const map = new Map(products.map((p) => [p._id, p]));
    setCart((prev) =>
      prev
        .filter((i) => map.has(i._id))
        .map((i) => {
          const p = map.get(i._id);
          return {
            ...i,
            name: p ? pickName(p, lang) : i.name,
            price: Number(p?.price ?? i.price ?? 0),
          };
        })
    );
  }, [products, lang]);

  const groupedByCategory = useMemo(() => {
    const groups = {};
    for (const p of products) {
      const cat = pickSubCategoryName(p, lang) || "Tjera";

      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }

    Object.keys(groups).forEach((k) => {
      groups[k] = groups[k]
        .slice()
        .sort((a, b) => pickName(a, lang).localeCompare(pickName(b, lang)));
    });

    return groups;
  }, [products, lang]);

  const categoryKeys = useMemo(
    () => Object.keys(groupedByCategory),
    [groupedByCategory]
  );

  const foodKeywords = [
    "ushqim",
    "ushqime",
    "food",
    "foods",
    "pizza",
    "pasta",
    "burger",
    "sallatë",
    "sallate",
    "mish",
    "pulë",
    "pule",
    "supë",
    "supe",
    "rizoto",
    "risotto",
    "embelsire",
    "ëmbëlsirë",
    "dessert",
  ];

  const drinkKeywords = [
    "pije",
    "drink",
    "drinks",
    "alkolike",
    "birra",
    "verë",
    "vere",
    "cocktail",
    "koktej",
    "juice",
    "leng",
    "ujë",
    "uje",
    "kafe",
    "coffee",
    "çaj",
    "caj",
    "tea",
  ];

  const foodCategories = useMemo(() => {
    return categoryKeys.filter((cat) => {
      const c = String(cat || "").toLowerCase();
      return foodKeywords.some((k) => c.includes(k));
    });
  }, [categoryKeys]);

  const drinkCategories = useMemo(() => {
    return categoryKeys.filter((cat) => {
      const c = String(cat || "").toLowerCase();
      return drinkKeywords.some((k) => c.includes(k));
    });
  }, [categoryKeys]);

  useEffect(() => {
    if (activeCatId === "all") return;
    if (!categoryKeys.includes(activeCatId)) setActiveCatId("all");
  }, [categoryKeys, activeCatId]);

  const visibleByFilter = useMemo(() => {
    const q = search.trim().toLowerCase();

    const productsWithoutOther = products.filter((p) => {
      const category = pickSubCategoryName(p, lang).trim().toLowerCase();
      return category !== "tjera";
    });

    const base =
      activeCatId === "all"
        ? productsWithoutOther
        : groupedByCategory[activeCatId] || [];

    if (!q) return base;

    return base.filter((p) =>
      pickName(p, lang).toLowerCase().includes(q)
    );
  }, [activeCatId, groupedByCategory, products, search, lang]);

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [cart]
  );

  const totalPrice = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 0) * Number(item.price || 0),
        0
      ),
    [cart]
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id);

      if (existing) {
        return prev.map((i) =>
          i._id === product._id
            ? { ...i, quantity: (Number(i.quantity) || 0) + 1 }
            : i
        );
      }

      return [
        ...prev,
        {
          _id: product._id,
          name: pickName(product, lang),
          price: Number(product.price || 0),
          quantity: 1,
        },
      ];
    });

    setSuccess("");
    setLastOrder(null);
    setBannerError("");
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === productId);
      if (!existing) return prev;

      if ((Number(existing.quantity) || 0) <= 1) {
        return prev.filter((i) => i._id !== productId);
      }

      return prev.map((i) =>
        i._id === productId
          ? { ...i, quantity: (Number(i.quantity) || 0) - 1 }
          : i
      );
    });

    setSuccess("");
    setLastOrder(null);
    setBannerError("");
  };

  const qtyInCart = useCallback(
    (id) => cart.find((i) => i._id === id)?.quantity || 0,
    [cart]
  );

  const printInvoice = () => window.print();

const handleSendOrder = async () => {
  if (cart.length === 0) {
    (t("chooseAtLeastOne"));
    return;
  }

  if (!businessId || !locationType || !locationCode) {
    (t("invalidQR"));
    return;
  }

  try {
    setSending(true);
    setBannerError("");
    setSuccess("");
    setLastOrder(null);

const payload = {
  businessId:
    (sessionStorage.getItem("guestBusinessId") || businessId || "")
      .trim(),
  sourceType:
    (sessionStorage.getItem("guestSourceType") || normalizedSourceType || "")
      .trim()
      .toLowerCase(),
  sourceNumber:
    (sessionStorage.getItem("guestSourceNumber") || locationCode || "")
      .trim()
      .toUpperCase(),
  items: cart.map((item) => ({
    productId: item._id,
    name: item.name,
    price: Number(item.price || 0),
    qty: Number(item.quantity || 0),
  })),
  total: totalPrice,
  createdBy: `Klient (${locationLabel})`,
  note: orderNote.trim(),
  orderNote: orderNote.trim(),
  fromClient: true,
  placeId: place?._id,
};

    const created = await createOrder(payload);
    const orderObj = created?.data ? created.data : created;

    setLastOrder(orderObj || null);
setCart([]);
setOrderNote("");
setSuccess(t("orderSent"));
setOpenMenuType(null);
setShowConfirmModal(false);

sessionStorage.removeItem("guestSessionToken");
sessionStorage.removeItem("guestSessionExpiresAt");
sessionStorage.removeItem("guestBusinessId");
sessionStorage.removeItem("guestSourceType");
sessionStorage.removeItem("guestSourceNumber");
  } catch (err) {
    console.error("Gabim gjatë dërgimit të porosisë:", err);

    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Nuk mund ta dërgoj porosinë. Provo përsëri.";

    setBannerError(msg);

    if (err?.response?.status === 401) {
      sessionStorage.removeItem("guestSessionToken");
      sessionStorage.removeItem("guestSessionExpiresAt");
      sessionStorage.removeItem("guestBusinessId");
      sessionStorage.removeItem("guestSourceType");
      sessionStorage.removeItem("guestSourceNumber");
    }
  } finally {
    setSending(false);
  }
};

const handleConfirmOrder = async () => {
  await handleSendOrder();
};

  const toggleMenuType = (type) => {
    setOpenMenuType((prev) => (prev === type ? null : type));
  };

  const handleCategoryPick = (cat) => {
    setActiveCatId(cat);
    setOpenMenuType(null);
  };

  const handleInvoiceClick = () => {
    const invoiceEl = document.getElementById("invoice");
    if (invoiceEl) {
      invoiceEl.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (lastOrder?._id) return;

    setBannerError("Fatura do të shfaqet pasi të dërgohet porosia.");
  };

  if (placeLoading) {
    return <div className="client-order-loading">{t("loadingMenu")}</div>;
  }

  if (fatalError) {
    return (
      <div className="client-order-wrapper">
        <div className="client-order-fatal-card">
          <h2>{t("invalidQR")}</h2>
          <p>{fatalError}</p>
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
  <div className="modern-brand-name">
    {businessName || "Menu"}
  </div>

  <div className="modern-brand-subtitle">
    Menu
  </div>
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
            placeholder="Kërko në menu..."
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
          {LANGS.map((language) => (
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

    {/* ERROR / SUCCESS */}
    {bannerError && (
      <div className="modern-message-wrap">
        <div className="modern-error-message">
          <span>{bannerError}</span>

          <button
            type="button"
            onClick={() => setBannerError("")}
          >
            ×
          </button>
        </div>
      </div>
    )}

    {success && (
      <div className="modern-message-wrap">
        <div className="modern-success-message">
          {success}
        </div>
      </div>
    )}

    {/* CATEGORIES */}
    <nav className="modern-categories">
      <button
        type="button"
        className={activeCatId === "all" ? "active" : ""}
        onClick={() => handleCategoryPick("all")}
      >
        Të gjitha
      </button>

      {categoryKeys
  .filter((category) => category.toLowerCase() !== "tjera")
  .map((category) => (
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
      {loading ? (
        <div className="modern-loading">
          {t("loadingMenu")}
        </div>
      ) : visibleByFilter.length === 0 ? (
        <div className="modern-empty">
          {t("noProductsForFilter")}
        </div>
      ) : (
        <div className="modern-products-grid">
          {visibleByFilter.map((product) => {
            const qty = qtyInCart(product._id);

            const image =
              product.thumbnail ||
              product.thumbnailUrl ||
              product.imageUrl ||
              product.image ||
              product.photoUrl ||
              "";

            const productName = pickName(product, lang) || "Produkt";

            const productDescription = pickDesc(product, lang);

            const categoryName =
              pickSubCategoryName(product, lang) || "Produkt";

            return (
              <article
                key={product._id}
                className="modern-product-card"
              >
                <div className="modern-product-image-wrap">
                  {image ? (
                    <img
                      src={image}
                      alt={productName}
                      className="modern-product-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="modern-product-placeholder">
                      {productName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <span className="modern-product-category">
                    {categoryName}
                  </span>

                  {qty > 0 ? (
                    <div className="modern-product-qty">
                      <button
                        type="button"
                        onClick={() =>
                          removeFromCart(product._id)
                        }
                      >
                        −
                      </button>

                      <span>{qty}</span>

                      <button
                        type="button"
                        onClick={() =>
                          addToCart(product)
                        }
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="modern-add-btn"
                      onClick={() =>
                        addToCart(product)
                      }
                      aria-label={`Shto ${productName}`}
                    >
                      +
                    </button>
                  )}
                </div>

                <div className="modern-product-content">
                  <h3>{productName}</h3>

                  {productDescription ? (
                    <p>{productDescription}</p>
                  ) : (
                    <p className="muted">
                      Produkt i disponueshëm për porosi.
                    </p>
                  )}

                  <div className="modern-product-footer">
                    <strong>
                      {Number(product.price || 0).toLocaleString(
                        "sq-AL",
                        {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }
                      )}{" "}
                      ALL
                    </strong>

                    {product.weight && (
                      <span>{product.weight}</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>

    {/* STICKY CART */}
    {cart.length > 0 && (
      <div className="modern-cart-bar-wrap">
        <div className="modern-cart-bar">
          <div className="modern-cart-summary">
            <div className="modern-receipt-icon">
              🧾

              <span>{totalItems}</span>
            </div>

            <div>
              <small>Porosia juaj</small>

              <strong>
                {totalPrice.toLocaleString("sq-AL", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}{" "}
                ALL
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="modern-view-order-btn"
            onClick={() => {
              clearTopMessages();
              setShowConfirmModal(true);
            }}
            disabled={sending}
          >
            {sending ? "Duke dërguar..." : "Shiko porosinë"}
            <span>→</span>
          </button>
        </div>
      </div>
    )}

    {/* CONFIRM MODAL */}
    {showConfirmModal && (
      <div
        className="confirm-modal modern-confirm-modal"
        onClick={() => setShowConfirmModal(false)}
      >
        <div
          className="confirm-card modern-confirm-card"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="confirm-head">
            <div>
              <div className="confirm-kicker">
                Konfirmim
              </div>

              <h3>Porosia juaj</h3>
            </div>

            <button
              type="button"
              className="confirm-close"
              onClick={() =>
                setShowConfirmModal(false)
              }
            >
              ×
            </button>
          </div>

          <div className="confirm-location">
            {locationLabel}
          </div>

          <div className="confirm-items">
            {cart.map((item) => (
              <div
                key={item._id}
                className="confirm-line"
              >
                <span>
                  <b>{item.quantity}x</b>{" "}
                  {item.name}
                </span>

                <span>
                  {(
                    Number(item.quantity || 0) *
                    Number(item.price || 0)
                  ).toLocaleString("sq-AL", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}{" "}
                  ALL
                </span>
              </div>
            ))}
          </div>

          <div className="confirm-note-box">
            <label>Shënim opsional</label>

            <textarea
              value={orderNote}
              onChange={(e) =>
                setOrderNote(e.target.value)
              }
              placeholder="P.sh. pa akull, pa qepë, silleni te dera..."
            />
          </div>

          <div className="confirm-total">
            <span>Total</span>

            <b>
              {totalPrice.toLocaleString("sq-AL", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}{" "}
              ALL
            </b>
          </div>

          <div className="confirm-actions">
            <button
              type="button"
              className="confirm-cancel"
              onClick={() =>
                setShowConfirmModal(false)
              }
            >
              Anulo
            </button>

            <button
              type="button"
              className="confirm-submit"
              onClick={handleConfirmOrder}
              disabled={sending}
            >
              {sending
                ? "Duke dërguar..."
                : "Konfirmo porosinë"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* INVOICE AFTER ORDER */}
    {lastOrder && (
      <section
        className="invoice-card modern-invoice"
        id="invoice"
      >
        <div className="invoice-head">
          <div>
            <div className="invoice-title">
              {t("invoice")}
            </div>

            <div className="invoice-sub">
              {locationLabel}
            </div>
          </div>

          <button
            type="button"
            className="invoice-btn"
            onClick={printInvoice}
          >
            Printo
          </button>
        </div>

        <div className="invoice-lines">
          {(lastOrder.items || []).map((item, index) => (
            <div
              key={index}
              className="invoice-line"
            >
              <div className="invoice-left">
                <b>{item.qty}x</b> {item.name}
              </div>

              <div className="invoice-right">
                {(
                  Number(item.price || 0) *
                  Number(item.qty || 0)
                ).toLocaleString("sq-AL", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}{" "}
                ALL
              </div>
            </div>
          ))}
        </div>

        <div className="invoice-total">
          <span>{t("total")}</span>

          <b>
            {Number(lastOrder.total || 0).toLocaleString(
              "sq-AL",
              {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }
            )}{" "}
            ALL
          </b>
        </div>
      </section>
    )}
  </div>
);
}