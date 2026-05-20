import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "./ClientOrderPage.css";
import { createOrder } from "../api/ordersApi.js";
import { socket } from "../realtime/socket.js";
import {
  getInitialLang,
  makeT,
  setLangPersist,
  LANGS,
} from "../i18n/i18n.js";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
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

  const [lang, setLang] = useState(() => getInitialLang(query));
  const t = useMemo(() => makeT(lang), [lang]);

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
            name: p?.name ?? i.name,
            price: Number(p?.price ?? i.price ?? 0),
          };
        })
    );
  }, [products]);

  const groupedByCategory = useMemo(() => {
    const groups = {};
    for (const p of products) {
      const cat = (
        p.subCategoryName ||
        p.subCategory ||
        p.category ||
        "Tjera"
      )
        .toString()
        .trim();

      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }

    Object.keys(groups).forEach((k) => {
      groups[k] = groups[k]
        .slice()
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""))
        );
    });

    return groups;
  }, [products]);

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
    const base =
      activeCatId === "all"
        ? products
        : groupedByCategory[activeCatId] || [];

    if (!q) return base;

    return base.filter((p) =>
      String(p.name || "").toLowerCase().includes(q)
    );
  }, [activeCatId, groupedByCategory, products, search]);

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
          name: product.name,
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
    alert(t("chooseAtLeastOne"));
    return;
  }

  if (!businessId || !locationType || !locationCode) {
    alert(t("invalidQR"));
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

  const changeLang = (next) => {
    if (!LANGS.includes(next)) return;

    setLang(next);
    setLangPersist(next);

    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", url.toString());
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
    <div className="client-order-wrapper">
      <header className="client-order-header premium">
        <div className="co-head-top">
          <div className="co-head-left">
            <div className="co-place-badge">
              {locationType === "room" ? "DHOMË" : "ÇADËR"}
            </div>

            <h1 className="client-order-title">{locationLabel}</h1>
            <p className="client-order-subtitle">{t("orderSubtitle")}</p>
          </div>

          <div className="co-right">
            <div
              className="co-header-actions"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                position: "relative",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className={`co-lang-btn ${openMenuType === "food" ? "active" : ""}`}
                  onClick={() => toggleMenuType("food")}
                  aria-label="Ushqime"
                  title="Ushqime"
                >
                  <FoodIcon />
                </button>

                {openMenuType === "food" && (
                  <div
                    className="co-mini-dropdown"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      minWidth: "180px",
                      background: "#ffffff",
                      border: "1px solid #dbe4f0",
                      borderRadius: "14px",
                      boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                      padding: "8px",
                      zIndex: 50,
                    }}
                  >
                    {foodCategories.length > 0 ? (
                      foodCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryPick(cat)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            background:
                              activeCatId === cat ? "#eff6ff" : "transparent",
                            color: "#0f172a",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            cursor: "pointer",
                            fontWeight: activeCatId === cat ? 700 : 500,
                          }}
                        >
                          {cat}
                        </button>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: "10px 12px",
                          color: "#64748b",
                          fontSize: "14px",
                        }}
                      >
                        Nuk ka kategori ushqimi
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className={`co-lang-btn ${openMenuType === "drink" ? "active" : ""}`}
                  onClick={() => toggleMenuType("drink")}
                  aria-label="Bar"
                  title="Bar"
                >
                  <DrinkIcon />
                </button>

                {openMenuType === "drink" && (
                  <div
                    className="co-mini-dropdown"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      minWidth: "180px",
                      background: "#ffffff",
                      border: "1px solid #dbe4f0",
                      borderRadius: "14px",
                      boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                      padding: "8px",
                      zIndex: 50,
                    }}
                  >
                    {drinkCategories.length > 0 ? (
                      drinkCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryPick(cat)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            background:
                              activeCatId === cat ? "#eff6ff" : "transparent",
                            color: "#0f172a",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            cursor: "pointer",
                            fontWeight: activeCatId === cat ? 700 : 500,
                          }}
                        >
                          {cat}
                        </button>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: "10px 12px",
                          color: "#64748b",
                          fontSize: "14px",
                        }}
                      >
                        Nuk ka kategori pijesh
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="co-lang-btn"
                onClick={handleInvoiceClick}
                aria-label="Fatura"
                title="Fatura"
              >
                <ReceiptIcon />
              </button>

              <div className="co-lang compact">
                {LANGS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`co-lang-btn ${lang === l ? "active" : ""}`}
                    onClick={() => changeLang(l)}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="co-pill">
              <span className="co-dot" />
              {t("live")}
            </div>
          </div>
        </div>
      </header>

      {bannerError && (
  <div className="co-top-messages">
    <div className="client-order-error-banner">
      <div>
        <strong>Vëmendje:</strong> {bannerError}
      </div>

      <button
        type="button"
        className="co-inline-close"
        onClick={() => setBannerError("")}
      >
        ✕
      </button>
    </div>
  </div>
)}

      {success && (
        <div className="client-order-success">
          {success}

          {lastOrder && (
            <div className="invoice-card" id="invoice">
              <div className="invoice-head">
                <div>
                  <div className="invoice-title">{t("invoice")}</div>
                  <div className="invoice-sub">
                    {locationLabel} •{" "}
                    {new Date(lastOrder.createdAt || Date.now()).toLocaleString()}
                  </div>
                </div>

                <div className="invoice-meta">
                  <div>
                    <b>{t("id")}:</b>{" "}
                    {lastOrder?._id ? String(lastOrder._id).slice(-6) : "-"}
                  </div>
                  <div>
                    <b>{t("status")}:</b> {lastOrder?.status || "pending"}
                  </div>
                </div>
              </div>

              <div className="invoice-lines">
                {(lastOrder.items || []).map((it, idx) => (
                  <div key={idx} className="invoice-line">
                    <div className="invoice-left">
                      <b>{it.qty}x</b> {it.name}
                    </div>
                    <div className="invoice-right">
                      {(Number(it.price || 0) * Number(it.qty || 0)).toFixed(2)} ALL
                    </div>
                  </div>
                ))}
              </div>

              <div className="invoice-total">
                <span>{t("total")}</span>
                <b>{Number(lastOrder.total || 0).toFixed(2)} ALL</b>
              </div>

              <div className="invoice-actions">
                <button
                  type="button"
                  className="invoice-btn"
                  onClick={printInvoice}
                >
                  Printo
                </button>

                <button
                  type="button"
                  className="invoice-btn secondary"
                  onClick={() => {
                    clearTopMessages();
                    setLastOrder(null);
                    setSearch("");
                    setActiveCatId("all");
                    setOpenMenuType(null);
                  }}
                >
                  Porosi tjetër
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <main className="co-list">
        {loading ? (
          <div className="client-order-loading">{t("loadingMenu")}</div>
        ) : activeCatId !== "all" ? (
          <div className="co-section-title">{activeCatId}</div>
        ) : null}

        {!loading && visibleByFilter.length === 0 ? (
          <div className="co-empty">{t("noProductsForFilter")}</div>
        ) : (
          <div className="client-order-grid">
            {visibleByFilter.map((p) => {
              const qty = qtyInCart(p._id);

              return (
                <article key={p._id} className="client-order-card premium-card">
                  <div className="client-order-info">
                    <div className="co-item-topline">
                      <span className="co-item-tag">
                        {p.subCategoryName || p.subCategory || p.category || "Produkt"}
                      </span>
                    </div>

                    <h3 className="client-order-item-name">{p.name}</h3>

                    {p.description ? (
                      <p className="client-order-item-desc">{p.description}</p>
                    ) : (
                      <p className="client-order-item-desc muted">
                        Produkt i disponueshëm për porosi online.
                      </p>
                    )}

                    <div className="client-order-item-price">
                      {Number(p.price || 0).toFixed(2)} ALL
                    </div>
                  </div>

                  <div className="client-order-actions">
                    {qty > 0 ? (
                      <div className="co-qty">
                        <button
                          type="button"
                          className="order-qty-btn"
                          onClick={() => removeFromCart(p._id)}
                          aria-label={t("decreaseQty")}
                        >
                          −
                        </button>

                        <span className="order-qty">{qty}</span>

                        <button
                          type="button"
                          className="order-qty-btn"
                          onClick={() => addToCart(p)}
                          aria-label={t("increaseQty")}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="order-add-btn"
                        onClick={() => addToCart(p)}
                      >
                        {t("add")}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <div className="client-order-footer premium-footer">
        <div className="client-order-summary">
          <div className="co-sum-left">
            <div className="co-sum-title">{locationLabel}</div>
            <div className="co-sum-sub">
              {totalItems} {t("items")} • {totalPrice.toFixed(2)} ALL
            </div>
          </div>

          <button
            className="client-order-send-btn"
            onClick={() => {
              clearTopMessages();
              setShowConfirmModal(true);
            }}
            disabled={sending || cart.length === 0}
          >
            {sending ? t("sending") : t("send")}
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <div className="confirm-modal">
          <div className="confirm-card">
            <div className="confirm-head">
              <div>
                <div className="confirm-kicker">Konfirmim</div>
                <h3>Porosia juaj</h3>
              </div>

              <button
                type="button"
                className="confirm-close"
                onClick={() => setShowConfirmModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="confirm-location">{locationLabel}</div>

            <div className="confirm-items">
              {cart.map((item) => (
                <div key={item._id} className="confirm-line">
                  <span>
                    <b>{item.quantity}x</b> {item.name}
                  </span>
                  <span>
                    {(Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)} ALL
                  </span>
                </div>
              ))}
            </div>
            <div className="confirm-note-box">
  <label>Shënim opsional</label>
  <textarea
    value={orderNote}
    onChange={(e) => setOrderNote(e.target.value)}
    placeholder="P.sh. pa akull, pa qepë, silleni te dera..."
  />
</div>

            <div className="confirm-total">
              <span>Total</span>
              <b>{totalPrice.toFixed(2)} ALL</b>
            </div>

            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                Anulo
              </button>

              <button
                type="button"
                className="confirm-submit"
                onClick={handleConfirmOrder}
                disabled={sending}
              >
                {sending ? "Duke dërguar..." : "Konfirmo porosinë"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}