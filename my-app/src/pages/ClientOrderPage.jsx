// src/pages/ClientOrderPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "./ClientOrderPage.css";
import { createOrder } from "../api/ordersApi.js";
import { socket } from "../realtime/socket.js";
import { getInitialLang, makeT, setLangPersist, LANGS } from "../i18n/i18n.js";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.100.71:5000";

export default function ClientOrderPage() {
  const query = useQuery();
  const businessId = query.get("businessId");
  const locationType = query.get("type");
  const locationNumber = query.get("number");

  // ✅ Language
  const [lang, setLang] = useState(() => getInitialLang(query));
  const t = useMemo(() => makeT(lang), [lang]);

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [lastOrder, setLastOrder] = useState(null);

  const [activeCatId, setActiveCatId] = useState("all");
  const [search, setSearch] = useState("");

  const locationLabel =
    locationType === "room" || locationType === "dhoma"
      ? `Dhoma ${locationNumber}`
      : locationType === "umbrella" || locationType === "cadra"
      ? `Çadra ${locationNumber}`
      : `Lokacioni ${locationNumber}`;

  const normalizedSourceType =
    locationType === "room" ? "dhoma" : locationType === "umbrella" ? "cadra" : locationType;

  const fetchProducts = useCallback(async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      setError("");

      const url = `${API_BASE_URL}/api/products?businessId=${encodeURIComponent(businessId)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !Array.isArray(data)) {
        const msg = data?.message || `Nuk mund të ngarkoj produktet (status ${res.status}).`;
        setError(msg);
        setProducts([]);
        return;
      }

      setProducts(data);
    } catch (err) {
      console.error("Gabim te ClientOrderPage:", err);
      setError("Gabim gjatë komunikimit me serverin.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId || !locationType || !locationNumber) {
      setError(t("invalidQR"));
      setLoading(false);
      return;
    }
    fetchProducts();
  }, [businessId, locationType, locationNumber, fetchProducts, t]);

  useEffect(() => {
    if (!businessId) return;

    const join = () => socket.emit("joinBusiness", businessId);

    if (socket.connected) join();
    socket.on("connect", join);

    const onProductsChanged = (payload) => {
      if (payload?.businessId && String(payload.businessId) !== String(businessId)) return;
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
      const cat = (p.subCategoryName || p.subCategory || p.category || "Tjera").toString().trim();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    Object.keys(groups).forEach((k) => {
      groups[k] = groups[k].slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    });
    return groups;
  }, [products]);

  const categoryKeys = useMemo(() => Object.keys(groupedByCategory), [groupedByCategory]);

  useEffect(() => {
    if (activeCatId === "all") return;
    if (!categoryKeys.includes(activeCatId)) setActiveCatId("all");
  }, [categoryKeys, activeCatId]);

  const visibleByFilter = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = activeCatId === "all" ? products : groupedByCategory[activeCatId] || [];
    if (!q) return base;
    return base.filter((p) => String(p.name || "").toLowerCase().includes(q));
  }, [activeCatId, groupedByCategory, products, search]);

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [cart]
  );

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.quantity) || 0) * Number(item.price || 0), 0),
    [cart]
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      if (existing) {
        return prev.map((i) =>
          i._id === product._id ? { ...i, quantity: (Number(i.quantity) || 0) + 1 } : i
        );
      }
      return [...prev, { _id: product._id, name: product.name, price: Number(product.price || 0), quantity: 1 }];
    });

    setSuccess("");
    setLastOrder(null);
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === productId);
      if (!existing) return prev;

      if ((Number(existing.quantity) || 0) <= 1) return prev.filter((i) => i._id !== productId);

      return prev.map((i) =>
        i._id === productId ? { ...i, quantity: (Number(i.quantity) || 0) - 1 } : i
      );
    });

    setSuccess("");
    setLastOrder(null);
  };

  const qtyInCart = useCallback((id) => cart.find((i) => i._id === id)?.quantity || 0, [cart]);

  const printInvoice = () => window.print();

  const handleSendOrder = async () => {
    if (cart.length === 0) {
      alert(t("chooseAtLeastOne"));
      return;
    }

    try {
      setSending(true);
      setError("");
      setSuccess("");
      setLastOrder(null);

      const payload = {
        businessId,
        sourceType: normalizedSourceType,
        sourceNumber: String(locationNumber),
        items: cart.map((item) => ({
          productId: item._id,
          name: item.name,
          price: Number(item.price || 0),
          qty: Number(item.quantity || 0),
        })),
        total: totalPrice,
        createdBy: `Klient (${locationLabel})`,
        fromClient: true,
      };

      const created = await createOrder(payload);
      const orderObj = created?.data ? created.data : created;
      setLastOrder(orderObj || null);

      setCart([]);
      setSuccess(t("orderSent"));
    } catch (err) {
      console.error("Gabim gjatë dërgimit të porosisë:", err);
      const msg = err.response?.data?.message || err.message || "Nuk mund ta dërgoj porosinë. Provo përsëri.";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const changeLang = (next) => {
    if (!LANGS.includes(next)) return;
    setLang(next);
    setLangPersist(next);

    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", url.toString());
  };

  if (loading) return <div className="client-order-loading">{t("loadingMenu")}</div>;
  if (error) return <div className="client-order-error">{error}</div>;

  return (
    <div className="client-order-wrapper">
      <header className="client-order-header">
        <div className="co-head-top">
          <div>
            <h1 className="client-order-title">{t("orderTitle")}</h1>
            <p className="client-order-subtitle">
              {locationLabel} • {t("orderSubtitle")}
            </p>
          </div>

          <div className="co-right">
            <div className="co-lang">
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

            <div className="co-pill">
              <span className="co-dot" />
              {t("live")}
            </div>
          </div>
        </div>

        <div className="co-controls">
          <div className="co-search">
            <span className="co-search-ico">🔎</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
            />
            {search.trim() ? (
              <button type="button" className="co-clear" onClick={() => setSearch("")} aria-label={t("clear")}>
                ✕
              </button>
            ) : null}
          </div>

          <div className="co-chips">
            <button
              type="button"
              className={activeCatId === "all" ? "co-chip active" : "co-chip"}
              onClick={() => setActiveCatId("all")}
            >
              {t("all")}
            </button>

            {categoryKeys.map((c) => (
              <button
                key={c}
                type="button"
                className={c === activeCatId ? "co-chip active" : "co-chip"}
                onClick={() => setActiveCatId(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </header>

      {success && (
        <div className="client-order-success">
          {success}

          {lastOrder && (
            <div className="invoice-card" id="invoice">
              <div className="invoice-head">
                <div>
                  <div className="invoice-title">{t("invoice")}</div>
                  <div className="invoice-sub">
                    {locationLabel} • {new Date(lastOrder.createdAt || Date.now()).toLocaleString()}
                  </div>
                </div>

                <div className="invoice-meta">
                  <div>
                    <b>{t("id")}:</b> {lastOrder?._id ? String(lastOrder._id).slice(-6) : "-"}
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
                      {(Number(it.price || 0) * Number(it.qty || 0)).toFixed(2)} €
                    </div>
                  </div>
                ))}
              </div>

              <div className="invoice-total">
                <span>{t("total")}</span>
                <b>{Number(lastOrder.total || 0).toFixed(2)} €</b>
              </div>

              <div className="invoice-actions">
                <button type="button" className="invoice-btn" onClick={printInvoice}>
                  🖨️ {t("print")}
                </button>

                <button
                  type="button"
                  className="invoice-btn secondary"
                  onClick={() => {
                    setSuccess("");
                    setLastOrder(null);
                    setSearch("");
                    setActiveCatId("all");
                  }}
                >
                  ➕ {t("anotherOrder")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <main className="co-list">
        {activeCatId !== "all" && <div className="co-section-title">{activeCatId}</div>}

        {visibleByFilter.length === 0 ? (
          <div className="co-empty">{t("noProductsForFilter")}</div>
        ) : (
          <div className="client-order-grid">
            {visibleByFilter.map((p) => {
              const qty = qtyInCart(p._id);

              return (
                <article key={p._id} className="client-order-card">
                  <div className="client-order-info">
                    <h3 className="client-order-item-name">{p.name}</h3>
                    {p.description ? <p className="client-order-item-desc">{p.description}</p> : null}
                    <div className="client-order-item-price">{Number(p.price || 0).toFixed(2)} €</div>
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
                      <button type="button" className="order-add-btn" onClick={() => addToCart(p)}>
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

      <div className="client-order-footer">
        <div className="client-order-summary">
          <div className="co-sum-left">
            <div className="co-sum-title">{locationLabel}</div>
            <div className="co-sum-sub">
              {totalItems} {t("items")} • {totalPrice.toFixed(2)} €
            </div>
          </div>

          <button className="client-order-send-btn" onClick={handleSendOrder} disabled={sending || cart.length === 0}>
            {sending ? t("sending") : t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
