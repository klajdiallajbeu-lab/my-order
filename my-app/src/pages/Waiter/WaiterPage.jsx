import { useCallback, useEffect, useMemo, useState } from "react";
import "./WaiterPage.css";
import { getProducts } from "../../api/productApi.js";
import { createOrder } from "../../api/ordersApi.js";
import { socket } from "../../realtime/socket.js";
import { api } from "../../api/http.js";

const CURRENT_WAITER_NAME =
  sessionStorage.getItem("waiterName") || "Kamarjer 1";

const getCurrencySymbol = (currency) => {
  switch (currency) {
    case "EUR":
      return "€";
    case "USD":
      return "$";
    case "CHF":
      return "CHF";
    case "GBP":
      return "£";
    case "ALL":
    default:
      return "ALL";
  }
};

export default function WaiterPage({ onLogout }) {
  const [locationType, setLocationType] = useState("tavoline");
  const [locationNumber, setLocationNumber] = useState("");

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState("");

  const [incomingOrders, setIncomingOrders] = useState([]);

  const [selectedCategoryType, setSelectedCategoryType] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  const handleLogout = () => {
    const ok = window.confirm("Je i sigurt që dëshiron të dalësh?");
    if (!ok) return;

    if (typeof onLogout === "function") return onLogout();

    sessionStorage.clear();
    window.location.replace("/login");
  };

  const businessId = useMemo(() => (localStorage.getItem("businessId") || "").trim(), []);

  const fetchProducts = useCallback(async () => {
    if (!businessId) {
      setError("Mungon businessId. Hyni përsëri.");
      setLoadingProducts(false);
      setProducts([]);
      return;
    }

    try {
      setLoadingProducts(true);
      setError("");

      const data = await getProducts({ businessId });
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gabim te getProducts:", err);
      setError("Nuk mund të ngarkoj produktet.");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [businessId]);

  const fetchIncomingOrders = useCallback(async () => {
    if (!businessId) return;

    try {
      const res = await api.get("/orders", {
        params: { businessId },
        headers: { "Cache-Control": "no-cache" },
      });

      const data = res?.data;
      if (!Array.isArray(data)) return;

      const fromRoomsAndUmbrellas = data.filter(
        (o) => o.sourceType === "dhoma" || o.sourceType === "cadra"
      );

      const mapped = fromRoomsAndUmbrellas.map((o) => ({
        id: o._id,
        sourceType: o.sourceType,
        sourceNumber: o.sourceNumber,
        items: o.items || [],
        total: Number(o.total || 0),
        totalALL: Number(o.totalALL || 0),
        currency: o.currency || "ALL",
        status: o.status || "pending",
        acceptedBy: o.acceptedBy || "",
      }));

      setIncomingOrders(mapped);
    } catch (err) {
      console.error("Gabim duke lexuar porositë:", err?.response?.data || err);
    }
  }, [businessId]);

  useEffect(() => {
    fetchProducts();
    fetchIncomingOrders();
  }, [fetchProducts, fetchIncomingOrders]);

  useEffect(() => {
    if (!businessId) return;

    const join = () => socket.emit("joinBusiness", businessId);

    if (socket.connected) join();
    socket.on("connect", join);

    const onProductsChanged = (payload) => {
      if (payload?.businessId && String(payload.businessId) !== String(businessId)) return;
      fetchProducts();
    };

    const onOrdersCreated = (payload) => {
      if (payload?.businessId && String(payload.businessId) !== String(businessId)) return;
      fetchIncomingOrders();
    };

    socket.on("products:changed", onProductsChanged);
    socket.on("orders:created", onOrdersCreated);

    return () => {
      socket.off("connect", join);
      socket.off("products:changed", onProductsChanged);
      socket.off("orders:created", onOrdersCreated);
    };
  }, [businessId, fetchProducts, fetchIncomingOrders]);

  useEffect(() => {
    if (!businessId) return;
    const interval = setInterval(fetchIncomingOrders, 20000);
    return () => clearInterval(interval);
  }, [businessId, fetchIncomingOrders]);

  const filteredIncoming = useMemo(
    () => incomingOrders.filter((o) => o.sourceType === locationType),
    [incomingOrders, locationType]
  );

  const pendingDhoma = useMemo(
    () =>
      incomingOrders.filter(
        (o) => o.sourceType === "dhoma" && o.status === "pending"
      ).length,
    [incomingOrders]
  );

  const pendingCadra = useMemo(
    () =>
      incomingOrders.filter(
        (o) => o.sourceType === "cadra" && o.status === "pending"
      ).length,
    [incomingOrders]
  );

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [cart]
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      if (existing) {
        return prev.map((i) =>
          i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i
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
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === productId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter((i) => i._id !== productId);
      return prev.map((i) =>
        i._id === productId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const handleSendOrder = async () => {
    if (locationType !== "tavoline") {
      alert("Zgjidh 'Tavolinë' për të dërguar porosi.");
      return;
    }
    if (!locationNumber.trim()) return alert("Vendos numrin e tavolinës.");
    if (cart.length === 0) return alert("Shto të paktën një produkt.");

    try {
      if (!businessId) return alert("Mungon businessId. Hyni përsëri.");

      const payload = {
        businessId,
        sourceType: locationType,
        sourceNumber: locationNumber,
        items: cart.map((item) => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          qty: item.quantity,
        })),
        total: totalPrice,
        createdBy: CURRENT_WAITER_NAME,
      };

      await createOrder(payload);

      setCart([]);
      alert("Porosia u dërgua!");
    } catch (err) {
      console.error("Gabim te dërgimi i porosisë:", err?.response?.data || err);
      alert("Nuk mund të dërgoj porosinë.");
    }
  };

  const handleAcceptIncoming = async (orderId) => {
    const ok = window.confirm("Ta marrësh këtë porosi?");
    if (!ok) return;

    setIncomingOrders((prev) =>
      prev.map((order) =>
        order.id === orderId && order.status === "pending"
          ? { ...order, status: "accepted", acceptedBy: CURRENT_WAITER_NAME }
          : order
      )
    );

    try {
      await api.patch(`/orders/${orderId}/status`, {
        status: "accepted",
        acceptedBy: CURRENT_WAITER_NAME,
      });
    } catch (err) {
      console.error("Gabim te updateOrderStatus (accepted):", err?.response?.data || err);
      fetchIncomingOrders();
    }
  };

  const handleMarkDone = async (orderId) => {
    setIncomingOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: "done" } : order
      )
    );

    try {
      await api.patch(`/orders/${orderId}/status`, { status: "done" });
    } catch (err) {
      console.error("Gabim te updateOrderStatus (done):", err?.response?.data || err);
      fetchIncomingOrders();
    }
  };

  const safeProducts = Array.isArray(products) ? products : [];

  const categoryMap = useMemo(() => {
    const map = {};
    safeProducts.forEach((p) => {
      const cat = (p.categoryType || "").trim();
      const sub = (p.subCategory || "").trim();
      if (!cat) return;
      if (!map[cat]) map[cat] = new Set();
      if (sub) map[cat].add(sub);
    });

    const normalized = {};
    Object.entries(map).forEach(([cat, set]) => {
      normalized[cat] = Array.from(set);
    });

    return normalized;
  }, [safeProducts]);

  const categoryTypes = Object.keys(categoryMap);

  const subCategoriesForSelected =
    selectedCategoryType && categoryMap[selectedCategoryType]
      ? categoryMap[selectedCategoryType]
      : [];

  const visibleProducts = useMemo(() => {
    if (!selectedCategoryType || !selectedSubCategory) return [];
    return safeProducts.filter((p) => {
      const cat = (p.categoryType || "").trim();
      const sub = (p.subCategory || "").trim();
      return cat === selectedCategoryType && sub === selectedSubCategory;
    });
  }, [safeProducts, selectedCategoryType, selectedSubCategory]);

  return (
    <div className="waiter-page">
      <header className="waiter-header">
        <div className="waiter-header-top">
          <div className="waiter-header-left">
            <h1>Kamarjeri</h1>
            <span className="waiter-subtitle">Bëj porosi shpejt nga telefoni</span>
          </div>

          <button type="button" className="waiter-logout-btn" onClick={handleLogout}>
            Dil
          </button>
        </div>
      </header>

      <section className="waiter-location">
        <div className="waiter-location-type">
          <button
            className={locationType === "tavoline" ? "wl-type-btn active" : "wl-type-btn"}
            onClick={() => setLocationType("tavoline")}
          >
            Tavolinë
          </button>

          <button
            className={locationType === "dhoma" ? "wl-type-btn active" : "wl-type-btn"}
            onClick={() => setLocationType("dhoma")}
          >
            Dhoma {pendingDhoma > 0 && <span className="wl-badge">{pendingDhoma}</span>}
          </button>

          <button
            className={locationType === "cadra" ? "wl-type-btn active" : "wl-type-btn"}
            onClick={() => setLocationType("cadra")}
          >
            Çadra {pendingCadra > 0 && <span className="wl-badge">{pendingCadra}</span>}
          </button>
        </div>

        {locationType === "tavoline" ? (
          <input
            className="waiter-location-input"
            type="number"
            min="1"
            placeholder="Nr i tavolinës (p.sh. 23)"
            value={locationNumber}
            onChange={(e) => setLocationNumber(e.target.value)}
          />
        ) : (
          <p className="waiter-location-hint">
            Për dhoma/çadra, porositë vijnë nga klientët me QR.
          </p>
        )}
      </section>

      {locationType === "tavoline" && (
        <section className="waiter-products-section">
          {loadingProducts && <p>Duke ngarkuar produktet...</p>}
          {error && <p className="error-text">{error}</p>}

          {categoryTypes.length > 0 && (
            <div className="waiter-categories">
              {categoryTypes.map((cat) => (
                <button
                  key={cat}
                  className={
                    selectedCategoryType === cat
                      ? "waiter-category-btn active"
                      : "waiter-category-btn"
                  }
                  onClick={() => {
                    setSelectedCategoryType(cat);
                    setSelectedSubCategory(null);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {selectedCategoryType && subCategoriesForSelected.length > 0 && (
            <div className="waiter-subcategories">
              {subCategoriesForSelected.map((sub) => (
                <button
                  key={sub}
                  className={
                    selectedSubCategory === sub
                      ? "waiter-subcategory-btn active"
                      : "waiter-subcategory-btn"
                  }
                  onClick={() => setSelectedSubCategory(sub)}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          <div className="waiter-products-grid">
            {visibleProducts.map((p) => (
              <div
                key={p._id}
                className="waiter-product-card"
                onClick={() => addToCart(p)}
              >
                <div className="waiter-product-name">{p.name}</div>
                <div className="waiter-product-price">{p.price} ALL</div>
              </div>
            ))}

            {!loadingProducts &&
              !error &&
              selectedCategoryType &&
              selectedSubCategory &&
              visibleProducts.length === 0 && (
                <p style={{ marginTop: "1rem" }}>Nuk ka produkte në këtë nën-kategori.</p>
              )}

            {!selectedCategoryType && !loadingProducts && !error && (
              <p style={{ marginTop: "1rem" }}>Zgjidh një kategori për të parë produktet.</p>
            )}

            {selectedCategoryType &&
              subCategoriesForSelected.length > 0 &&
              !selectedSubCategory &&
              !loadingProducts &&
              !error && (
                <p style={{ marginTop: "1rem" }}>
                  Zgjidh një nën-kategori për të parë produktet.
                </p>
              )}
          </div>

          <div className="waiter-cart">
            <h3>Kartela ({totalItems} artikuj)</h3>
            {cart.length === 0 && <p>S’ka produkte në porosi.</p>}

            {cart.map((item) => (
              <div key={item._id} className="waiter-cart-row">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <div className="waiter-cart-actions">
                  <button type="button" onClick={() => removeFromCart(item._id)}>
                    -
                  </button>
                  <span>{(item.quantity * item.price).toFixed(2)} ALL</span>
                </div>
              </div>
            ))}

            {cart.length > 0 && (
              <div className="waiter-cart-footer">
                <span>Total: {totalPrice.toFixed(2)} ALL</span>
                <button type="button" className="waiter-send-btn" onClick={handleSendOrder}>
                  Dërgo porosinë
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {(locationType === "dhoma" || locationType === "cadra") && (
        <section className="waiter-incoming">
          <h2>Porosi nga {locationType === "dhoma" ? "dhomat" : "çadrat"}</h2>

          {filteredIncoming.length === 0 && (
            <div className="incoming-empty">Nuk ka porosi nga klientët.</div>
          )}

          {filteredIncoming.map((order) => (
            <div key={order.id} className={`incoming-card status-${order.status}`}>
              <div className="incoming-top">
                <div className="incoming-left">
                  <div className="incoming-source">
                    {order.sourceType.toUpperCase()} {order.sourceNumber}
                  </div>
                  <div className="incoming-status">
                    {order.status === "pending" && "Në pritje"}
                    {order.status === "accepted" && "E pranuar"}
                    {order.status === "done" && "E dërguar"}
                  </div>
                </div>

                <div className="incoming-total">
                  {Number(order.total).toFixed(2)} {getCurrencySymbol(order.currency)}
                </div>
              </div>

              <div className="incoming-items">
                {order.items.map((it, idx) => (
                  <div key={idx} className="incoming-item-row">
                    <span>{it.qty}x {it.name}</span>
                  </div>
                ))}
              </div>

              <div className="incoming-actions">
                {order.status === "pending" && (
                  <button
                    type="button"
                    className="incoming-btn accept"
                    onClick={() => handleAcceptIncoming(order.id)}
                  >
                    Accepto
                  </button>
                )}

                {order.status === "accepted" && order.acceptedBy === CURRENT_WAITER_NAME && (
                  <>
                    <span className="incoming-info">E pranuar nga ti ({CURRENT_WAITER_NAME})</span>
                    <button
                      type="button"
                      className="incoming-btn done"
                      onClick={() => handleMarkDone(order.id)}
                    >
                      Dërgo u krye
                    </button>
                  </>
                )}

                {order.status === "accepted" && order.acceptedBy !== CURRENT_WAITER_NAME && (
                  <span className="incoming-info">E marrë nga {order.acceptedBy}</span>
                )}

                {order.status === "done" && (
                  <span className="incoming-info">✔ Porosia është dërguar</span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}