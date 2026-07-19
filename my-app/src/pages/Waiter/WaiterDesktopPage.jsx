import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WaiterDesktopPage.css";
import { api } from "../../api/http.js";
import { socket } from "../../realtime/socket.js";
import { useRef } from "react";

const CURRENT_WAITER_NAME =
  sessionStorage.getItem("waiterName") ||
  localStorage.getItem("waiterName") ||
  "Kamarjer";


const getCurrencySymbol = (currency) => {
  switch (currency) {
    case "EUR":
      return "€";
    case "USD":
      return "$";
    case "GBP":
      return "£";
    case "CHF":
      return "CHF";
    case "ALL":
    default:
      return "ALL";
  }
};

export default function WaiterDesktopPage({ onLogout }) {
  const navigate = useNavigate();

  const [currentWaiterId, setCurrentWaiterId] = useState("");

useEffect(() => {
  const id =
    sessionStorage.getItem("waiterId") ||
    localStorage.getItem("waiterId") ||
    "";

  setCurrentWaiterId(id);
}, []);

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );


  const [locationType, setLocationType] = useState("tavoline");
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const [selectedTable, setSelectedTable] = useState("");
  const [error, setError] = useState("");

  const [selectedCategoryType, setSelectedCategoryType] = useState("Ushqime");
  const [subCategories, setSubCategories] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [allProducts, setAllProducts] = useState([]);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [orderNote, setOrderNote] = useState("");

  const [pendingDhoma, setPendingDhoma] = useState(0);
  const [pendingCadra, setPendingCadra] = useState(0);
  const [incomingOrders, setIncomingOrders] = useState([]);

const [selectedIncomingOrder, setSelectedIncomingOrder] = useState(null);
  const [handledOrderIds, setHandledOrderIds] = useState([]);
  const isPrintingRef = useRef(false);

  const [isOnline, setIsOnline] = useState(socket.connected);

  useEffect(() => {
    const setOn = () => setIsOnline(true);
    const setOff = () => setIsOnline(false);

    socket.on("connect", setOn);
    socket.on("disconnect", setOff);

    return () => {
      socket.off("connect", setOn);
      socket.off("disconnect", setOff);
    };
  }, []);

  const activeSourceLabel = useMemo(() => {
    if (selectedIncomingOrder?.sourceType === "dhoma") {
      return `Dhoma ${selectedIncomingOrder.sourceNumber}`;
    }

    if (selectedIncomingOrder?.sourceType === "cadra") {
      return `Çadra ${selectedIncomingOrder.sourceNumber}`;
    }

    if (selectedTable) {
      return `Tavolina ${selectedTable}`;
    }

    return "";
  }, [selectedIncomingOrder, selectedTable]);

  const handleLogout = () => {
    const ok = window.confirm("Je i sigurt që dëshiron të dalësh?");
    if (!ok) return;

    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    sessionStorage.clear();
    localStorage.removeItem("waiterId");
    localStorage.removeItem("waiterName");
    window.location.replace("/login");
  };

const fetchTables = useCallback(async () => {
  if (!businessId || !currentWaiterId) return;

  try {
    setLoadingTables(true);

    const res = await api.get("/places", {
      params: {
        businessId,
        type: "table",
      },
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    setTables(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("Gabim te tavolinat:", err?.response?.data || err);
    setTables([]);
  } finally {
    setLoadingTables(false);
  }
}, [businessId, currentWaiterId]);

const fetchIncomingOrders = useCallback(async () => {
  if (!businessId) return;

  try {
    const res = await api.get("/orders", {
      params: { businessId },
      headers: { "Cache-Control": "no-cache" },
    });

    const orders = Array.isArray(res?.data) ? res.data : [];

    const activeOrders = orders.filter((o) => {
      const status = String(o.status || "").toLowerCase();

      return (
        status !== "done" &&
        status !== "closed" &&
        status !== "cancelled"
      );
    });

    setIncomingOrders(activeOrders);

    setPendingDhoma(
      activeOrders.filter(
        (o) =>
          o.sourceType === "dhoma" &&
          String(o.status || "").toLowerCase() === "pending"
      ).length
    );

    setPendingCadra(
      activeOrders.filter(
        (o) =>
          o.sourceType === "cadra" &&
          String(o.status || "").toLowerCase() === "pending"
      ).length
    );
  } catch (err) {
    console.error("Gabim te incoming orders:", err?.response?.data || err);
  }
}, [businessId]);

  const fetchSubCategories = useCallback(async () => {
    if (!businessId) return;

    try {
      const res = await api.get("/subcategories", {
        params: {
          businessId,
          categoryType: selectedCategoryType,
        },
      });

      const data = Array.isArray(res?.data) ? res.data : [];
      setSubCategories(data);

      setSelectedSubCategory((prev) => {
        if (!data.length) return null;

        if (prev) {
          const stillExists = data.find(
            (item) => String(item._id) === String(prev._id)
          );
          if (stillExists) return stillExists;
        }

        return data[0];
      });
    } catch (err) {
      console.error("Gabim te subcategories:", err?.response?.data || err);
      setSubCategories([]);
      setSelectedSubCategory(null);
    }
  }, [businessId, selectedCategoryType]);

  const fetchProducts = useCallback(async () => {
    if (!businessId || !selectedSubCategory?._id) {
      setProducts([]);
      return;
    }

    try {
      setLoadingProducts(true);

      const res = await api.get("/products", {
        params: {
          businessId,
          subCategoryId: selectedSubCategory._id,
        },
      });

      setProducts(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Gabim te produktet:", err?.response?.data || err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [businessId, selectedSubCategory]);

  const fetchAllProducts = useCallback(async () => {
    if (!businessId) return;

    try {
      const res = await api.get("/products", { params: { businessId } });
      setAllProducts(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Gabim te all products:", err?.response?.data || err);
    }
  }, [businessId]);

  useEffect(() => {
    fetchTables();
    fetchIncomingOrders();
  }, [fetchTables, fetchIncomingOrders]);

  useEffect(() => {
    fetchSubCategories();
  }, [fetchSubCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  useEffect(() => {
    if (!businessId) return;

    const join = () => {
      socket.emit("joinBusiness", businessId);
    };

    if (socket.connected) join();
    socket.on("connect", join);

    const refreshDesktop = (payload) => {
      if (
        payload?.businessId &&
        String(payload.businessId) !== String(businessId)
      ) {
        return;
      }

      fetchIncomingOrders();
      fetchTables();
    };

    socket.on("orders:created", refreshDesktop);
    socket.on("orders:changed", refreshDesktop);
    socket.on("order:created", refreshDesktop);
    socket.on("order:updated", refreshDesktop);

    return () => {
      socket.off("connect", join);
      socket.off("orders:created", refreshDesktop);
      socket.off("orders:changed", refreshDesktop);
      socket.off("order:created", refreshDesktop);
      socket.off("order:updated", refreshDesktop);
    };
  }, [businessId, fetchIncomingOrders, fetchTables]);

  useEffect(() => {
    if (!businessId) return;

    const interval = setInterval(() => {
      fetchIncomingOrders();
      fetchTables();
    }, 15000);

    return () => clearInterval(interval);
  }, [businessId, fetchIncomingOrders, fetchTables]);

  const occupiedTablesMap = useMemo(() => {
    const map = new Map();

    tables.forEach((t) => {
      const code = String(t.code || "").trim();

      map.set(code, {
        isOccupied: !!t.isOccupied,
        occupiedByWaiterId: String(t.occupiedByWaiterId || ""),
        placeId: t._id,
      });
    });

    return map;
  }, [tables]);

const filteredIncomingOrders = useMemo(() => {
  return incomingOrders.filter((order) => {
    const status = String(order?.status || "").toLowerCase();
    const orderId = String(order?._id || order?.id || "");
    const sourceType = String(order?.sourceType || "");

    if (!orderId) return false;

    if (sourceType !== locationType) return false;

    if (handledOrderIds.map(String).includes(orderId)) return false;

    if (["accepted", "done", "closed", "cancelled"].includes(status))
  return false;

    return true;
  });
}, [incomingOrders, locationType, handledOrderIds]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return products;

    // Kur ka kërkim, kërko në TË GJITHË produktet e biznesit,
    // pavarësisht kategorisë/nën-kategorisë aktive
    return allProducts.filter((p) =>
      String(p?.nameSq || p?.name || p?.title || "")
        .toLowerCase()
        .includes(q)
    );
  }, [products, allProducts, search]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.qty || 0);
    }, 0);
  }, [cart]);

  const handleSelectTable = (tableCode) => {
    const code = String(tableCode || "").trim();
    if (!code) return;

    const occ = occupiedTablesMap.get(code);

    const isTakenByOther =
      occ?.isOccupied &&
      occ?.occupiedByWaiterId &&
      String(occ.occupiedByWaiterId) !== String(currentWaiterId);

    if (isTakenByOther) {
      setError("Kjo tavolinë është zënë nga një kamarjer tjetër.");
      return;
    }

    setSelectedIncomingOrder(null);
    setError("");
    setSelectedTable(code);
  };

const handleAcceptIncoming = async (order) => {

  console.log("ACCEPT DESKTOP NEW VERSION");
  
  const ok = window.confirm("Ta marrësh këtë porosi dhe ta printosh?");
  if (!ok) return;

  const orderId = order._id || order.id;

  try {
    const res = await api.patch(`/orders/${orderId}/status`, {
      status: "accepted",
      acceptedBy: currentWaiterId,
      acceptedByName: CURRENT_WAITER_NAME,
    });

    const acceptedOrder = res?.data || order;


    setSelectedIncomingOrder(null);
    setSelectedTable("");
    setCart([]);
    setOrderNote("");

    await fetchIncomingOrders();

setTimeout(() => {
  setSelectedIncomingOrder(null);
  setSelectedTable("");
  setCart([]);
  setOrderNote("");
}, 1000);
  } catch (err) {
    console.error("Gabim gjatë accept/print:", err?.response?.data || err);
    ("Gabim gjatë accept/print.");
  }
};

  const handleMarkDone = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/status`, {
        status: "done",
      });

      setHandledOrderIds((prev) => [...prev, String(orderId)]);

      if (
        selectedIncomingOrder &&
        String(selectedIncomingOrder._id || selectedIncomingOrder.id) ===
          String(orderId)
      ) {
        setCart([]);
        setSelectedIncomingOrder(null);
        setSelectedTable("");
      }

      await fetchIncomingOrders();
    } catch (err) {
      console.error("Gabim te done:", err?.response?.data || err);
      ("Nuk mund ta bëj done porosinë.");
    }
  };

  const addToCart = (product) => {
    if (!selectedTable) {
      ("Zgjidh fillimisht tavolinën.");
      return;
    }

    const productId = String(product?._id || product?.id || "");
    if (!productId) {
      ("Ky produkt nuk ka ID.");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((x) => String(x.productId) === productId);

      if (existing) {
        return prev.map((x) =>
          String(x.productId) === productId
            ? { ...x, qty: Number(x.qty) + 1 }
            : x
        );
      }

return [
  ...prev,
  {
    productId,
    name: product?.nameSq || product?.name || product?.title || "Produkt",
    price: Number(product?.price || 0),
    qty: 1,
    currency: product?.currency || "ALL",

    categoryType:
      product?.categoryType ||
      selectedCategoryType ||
      "",

    destination:
      product?.destination ||
      selectedSubCategory?.destination ||
      "banak",
  },
];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) =>
      prev.filter((item) => String(item.productId) !== String(productId))
    );
  };

const clearCart = () => {
  setCart([]);
  setOrderNote("");
  setSelectedIncomingOrder(null);
  setSelectedTable("");
};

  const buildOrderPayload = (mode) => {
    const sourceType =
      selectedIncomingOrder?.sourceType ||
      (locationType === "dhoma" || locationType === "cadra"
        ? locationType
        : "tavoline");

    const sourceNumber =
      selectedIncomingOrder?.sourceNumber || selectedTable;
return {
  businessId,
  sourceType,
  sourceNumber,
createdBy: CURRENT_WAITER_NAME,
waiterId: currentWaiterId,
waiterName: CURRENT_WAITER_NAME,
acceptedBy: currentWaiterId,
acceptedByName: CURRENT_WAITER_NAME,
  printMode: mode,
  createdFrom: "waiter-desktop",
  note: orderNote.trim(),
  orderNote: orderNote.trim(),
items: cart.map((item) => ({
  productId: item.productId,
  name: item.name,
  price: Number(item.price),
  qty: Number(item.qty),

  categoryType: item.categoryType,
  destination: item.destination,
})),
};
  };

const printDirect = async () => {
  if (isPrintingRef.current) return;

  if (!selectedTable) {
    ("Zgjidh fillimisht tavolinën/dhomën/çadrën.");
    return;
  }

  if (cart.length === 0) {
    ("Shto të paktën një produkt.");
    return;
  }

  isPrintingRef.current = true;

  try {
    const sourceType = selectedIncomingOrder?.sourceType || "tavoline";
    const sourceNumber = selectedIncomingOrder?.sourceNumber || selectedTable;
    const noteText = orderNote.trim();

    const payload = {
      ...buildOrderPayload("printo"),
      sourceType,
      sourceNumber,
      createdFrom: "waiter-desktop",
      note: noteText,
      orderNote: noteText,
    };

    await api.post("/orders", payload, {
    });

    if (sourceType === "tavoline") {
      const resPlaces = await api.get("/places", {
        params: {
          businessId,
          type: "table",
        },
      });

      const place = (resPlaces.data || []).find(
        (p) =>
          String(p.code || "").trim() === String(sourceNumber || "").trim()
      );

      if (place?._id) {
        await api.patch(`/places/${place._id}/occupy`, {
          type: "table",
          waiterId: currentWaiterId,
          occupiedByWaiterId: currentWaiterId,
        });
      }
    }

    setCart([]);
    setOrderNote("");
    setSelectedIncomingOrder(null);
    setSelectedTable("");

    await fetchTables();
    await fetchIncomingOrders();

  } catch (err) {
    console.error("Gabim gjatë dërgimit për printim:", err);
    (
      err?.response?.data?.message ||
        err?.message ||
        "Nuk mund të dërgoj porosinë për printim."
    );
  } finally {
    setTimeout(() => {
      isPrintingRef.current = false;
    }, 1500);
  }
};

const handleSubmitOrder = async (mode) => {
  if (!selectedTable) {
    ("Zgjidh fillimisht tavolinën/dhomën/çadrën.");
    return;
  }

  if (cart.length === 0) {
    ("Shto të paktën një produkt.");
    return;
  }

  try {
    const activeOrderId =
      selectedIncomingOrder?._id || selectedIncomingOrder?.id || "";

    // Kur vjen nga porosi e pranuar, MOS krijo porosi të re
    if (activeOrderId) {
      await api.patch(`/orders/${activeOrderId}/status`, {
        status: "done",
      });

      setHandledOrderIds((prev) => [...prev, String(activeOrderId)]);

      setIncomingOrders((prev) =>
        prev.filter((o) => String(o._id || o.id) !== String(activeOrderId))
      );

      setCart([]);
      setSelectedIncomingOrder(null);
      setSelectedTable("");

      await fetchTables();
      await fetchIncomingOrders();

      ("Fatura u mbyll me sukses.");
      return;
    }

    // Kjo përdoret vetëm kur kamarieri krijon porosi vetë nga tavolina
    const payload = buildOrderPayload(mode);

    await api.post("/orders", payload, {

    });
    if (payload.sourceType === "tavoline") {
  const resPlaces = await api.get("/places", {
    params: {
      businessId,
      type: "table",
    },
  });

  const place = (resPlaces.data || []).find(
    (p) =>
      String(p.code || "").trim() ===
      String(payload.sourceNumber || "").trim()
  );

  if (place?._id) {
    await api.patch(`/places/${place._id}/occupy`, {
      type: "table",
      waiterId: currentWaiterId,
      occupiedByWaiterId: currentWaiterId,
    });
  }
}


    setCart([]);
    setSelectedIncomingOrder(null);
    setSelectedTable("");

    await fetchTables();
    await fetchIncomingOrders();
  } catch (err) {
    console.error("Gabim gjatë dërgimit:", err?.response?.data || err);
    (err?.response?.data?.message || "Nuk mund të dërgoj porosinë.");
  }
};

  const selectLocationType = (type) => {
    setLocationType(type);
    setSelectedTable("");
    setSelectedIncomingOrder(null);
    setCart([]);
    setError("");
  };

  return (
    <div className="waiter-page waiter-desktop-page">
      <header className="waiter-header">
  <div className="waiter-header-top">
<div className="waiter-header-left">
      <h1>Kamarjeri</h1>
      <span className="waiter-subtitle-row">
        <span className="waiter-subtitle">{CURRENT_WAITER_NAME}</span>
        <span className={`waiter-status-dot ${isOnline ? "on" : "off"}`} />
        <span className="waiter-status-text">{isOnline ? "Online" : "Offline"}</span>
      </span>
    </div>

    <div className="waiter-header-actions">
      <button
        type="button"
        className="waiter-top-btn"
        onClick={() => navigate("/waiter/open-tables")}
      >
        Tavolina të hapura
      </button>

      <button
        type="button"
        className="waiter-top-btn danger"
        onClick={() => navigate("/waiter/xhiro")}
      >
        Mbyll Xhiron
      </button>

      <button
        type="button"
        className="waiter-logout-btn"
        onClick={handleLogout}
        aria-label="Dil"
        title="Dil"
      >
        <span className="waiter-logout-icon">↪</span>
      </button>
    </div>
  </div>
</header>

      <div className="waiter-desktop-layout">
        <aside className="waiter-desktop-left">
          <div className="desktop-panel desktop-left-panel">
            <div className="desktop-panel-header">
              <h2 className="desktop-panel-title">
                {locationType === "tavoline" && "Tavolinat"}
                {locationType === "dhoma" && "Porosi Dhomash"}
                {locationType === "cadra" && "Porosi Çadrash"}
              </h2>
            </div>

            <div className="waiter-location-type desktop-location-tabs">
              <button
                className={
                  locationType === "tavoline"
                    ? "wl-type-btn active"
                    : "wl-type-btn"
                }
                onClick={() => selectLocationType("tavoline")}
              >
                Tavolinë
              </button>

              <button
                className={
                  locationType === "dhoma" ? "wl-type-btn active" : "wl-type-btn"
                }
                onClick={() => selectLocationType("dhoma")}
              >
                Dhoma
                {pendingDhoma > 0 && (
                  <span className="wl-badge">{pendingDhoma}</span>
                )}
              </button>

              <button
                className={
                  locationType === "cadra" ? "wl-type-btn active" : "wl-type-btn"
                }
                onClick={() => selectLocationType("cadra")}
              >
                Çadra
                {pendingCadra > 0 && (
                  <span className="wl-badge">{pendingCadra}</span>
                )}
              </button>
            </div>

            {locationType === "tavoline" ? (
              <div className="desktop-tables-wrap">
                {loadingTables && (
                  <p className="waiter-location-hint">
                    Duke ngarkuar tavolinat...
                  </p>
                )}

                {!loadingTables && tables.length === 0 && (
                  <p className="waiter-location-hint">
                    Nuk ka tavolina të krijuara.
                  </p>
                )}

                {!loadingTables && tables.length > 0 && (
                  <div className="tables-grid desktop-tables-grid">
                    {[...tables]
                      .sort((a, b) => Number(a.code) - Number(b.code))
                      .map((t) => {
                        const code = String(t.code || "").trim();
                        const occ = occupiedTablesMap.get(code);

                        const isOccupied = !!occ?.isOccupied;
                        const isMine =
                          isOccupied &&
                          String(occ?.occupiedByWaiterId || "") ===
                            String(currentWaiterId);
                        const isBlocked = isOccupied && !isMine;
                        const isActive = String(selectedTable) === code;

                        return (
                          <button
                            key={t._id}
                            type="button"
                            disabled={isBlocked}
                            className={`table-box ${
                              isActive ? "active" : ""
                            } ${isMine ? "mine" : ""} ${
                              isBlocked ? "blocked" : ""
                            }`}
                            onClick={() => handleSelectTable(code)}
                          >
                            {code}
                          </button>
                        );
                      })}
                  </div>
                )}

                {!loadingTables && tables.length > 0 && (
                  <div className="table-legend">
                    <span><i className="legend-dot selected" /> E zgjedhur</span>
                    <span><i className="legend-dot occupied" /> E zënë</span>
                    <span><i className="legend-dot free" /> E lirë</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="desktop-incoming-wrap">
                {filteredIncomingOrders.length === 0 ? (
                  <div className="incoming-empty">
                    Nuk ka porosi nga{" "}
                    {locationType === "dhoma" ? "dhomat" : "çadrat"}.
                  </div>
                ) : (
                  filteredIncomingOrders.map((order) => {
                    const orderId = order._id || order.id;
                    const status = String(order?.status || "pending");
                    const acceptedBy = order?.acceptedBy || "";

                    return (
                      <div
                        key={orderId}
                        className={`incoming-card status-${status}`}
                      >
                        <div className="incoming-top">
                          <div className="incoming-left">
                            <div className="incoming-source">
                              {locationType === "dhoma" ? "DHOMA" : "ÇADRA"}{" "}
                              {order.sourceNumber}
                            </div>

                            <div className="incoming-status">
                              {status === "pending" && "Në pritje"}
                              {status === "accepted" && "E pranuar"}
                            </div>
                          </div>

                          <div className="incoming-total">
                            {Number(order.total || 0).toFixed(2)}{" "}
                            {getCurrencySymbol(order.currency)}
                          </div>
                        </div>

                        <div className="incoming-items">
                          {(order.items || []).map((it, idx) => (
                            <div key={idx} className="incoming-item-row">
                              <span>
                                {it.qty}x {it.name}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="incoming-actions">
                          {status === "pending" && (
                            <button
                              type="button"
                              className="incoming-btn accept"
                              onClick={() => handleAcceptIncoming(order)}
                            >
                              Prano
                            </button>
                          )}

                          {status === "accepted" &&
                            String(acceptedBy) !== String(currentWaiterId)  && (
                              <span className="incoming-info">
                                E marrë nga {acceptedBy || "kamarjer tjetër"}
                              </span>
                            )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {error && <p className="error-text">{error}</p>}
          </div>
        </aside>

        <section className="waiter-desktop-center">
          <div className="desktop-panel desktop-order-panel">
            <div className="desktop-order-top">
              <div className="desktop-order-heading">
                <h2 className="desktop-order-title">
                  Produkte
                  {activeSourceLabel ? (
                    <span className="desktop-order-title-light">
                      {" "}
                      • {activeSourceLabel}
                    </span>
                  ) : null}
                </h2>
              </div>

              <div className="desktop-search-row top-search">
                <input
                  type="text"
                  className="desktop-search-input"
                  placeholder="Kërko produktin..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="desktop-main-categories">
              <button
                type="button"
                className={
                  selectedCategoryType === "Ushqime"
                    ? "desktop-main-cat-btn active"
                    : "desktop-main-cat-btn"
                }
                onClick={() => {
                  setSelectedCategoryType("Ushqime");
                  setSelectedSubCategory(null);
                  setProducts([]);
                }}
              >
                Ushqime
              </button>

              <button
                type="button"
                className={
                  selectedCategoryType === "Pije"
                    ? "desktop-main-cat-btn active"
                    : "desktop-main-cat-btn"
                }
                onClick={() => {
                  setSelectedCategoryType("Pije");
                  setSelectedSubCategory(null);
                  setProducts([]);
                }}
              >
                Pije
              </button>
            </div>

            <div className="desktop-subcategories">
              {subCategories.map((sub) => (
                <button
                  key={sub._id}
                  type="button"
                  className={`desktop-subcategory-btn ${
                    selectedSubCategory?._id === sub._id ? "active" : ""
                  }`}
                  onClick={() => setSelectedSubCategory(sub)}
                >
                  {sub.nameSq || sub.nameEn || sub.nameIt || "Nënkategori"}
                </button>
              ))}
            </div>

            <div className="desktop-products-grid no-image-grid">
              {loadingProducts && (
                <div className="incoming-empty">Duke ngarkuar produktet...</div>
              )}

              {!loadingProducts && !selectedSubCategory && (
                <div className="incoming-empty">
                  Nuk ka nënkategori për këtë seksion.
                </div>
              )}

              {!loadingProducts &&
                selectedSubCategory &&
                filteredProducts.length === 0 && (
                  <div className="incoming-empty">
                    Nuk ka produkte në këtë nënkategori.
                  </div>
                )}

              {!loadingProducts &&
                filteredProducts.map((product) => {
                  const productId = String(product?._id || product?.id || "");
                  const name =
                    product?.nameSq ||
                    product?.name ||
                    product?.title ||
                    "Produkt";
                  const price = Number(product?.price || 0);
                  const currency = product?.currency || "ALL";

                  return (
                    <button
                      key={productId}
                      type="button"
                      className="desktop-product-card no-image"
                      onClick={() => addToCart(product)}
                      disabled={!selectedTable || locationType !== "tavoline"}
                    >
                      <div className="desktop-product-name">{name}</div>
                      <div className="desktop-product-price">
                        {price.toFixed(2)} {getCurrencySymbol(currency)}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </section>

        <aside className="waiter-desktop-cart">
          <div className="desktop-cart-card sticky-cart">
            <div className="desktop-cart-header">
              <div>
                <div className="desktop-cart-title">Fatura</div>
                <div className="desktop-cart-subtitle">
                  {activeSourceLabel
                    ? `Porosia aktuale • ${activeSourceLabel}`
                    : "Porosia aktuale"}
                </div>
              </div>

              {selectedTable ? (
                <span className="desktop-cart-badge">#{selectedTable}</span>
              ) : null}
            </div>

            <div className="desktop-cart-list flat-list">
              {cart.length === 0 ? (
                <div className="desktop-cart-empty">
                  <span className="cart-empty-icon">🧺</span>
                  Nuk ka produkte në porosi.
                </div>
              ) : (
                cart.map((item) => (
  <div
    key={item.productId}
    className="desktop-cart-row clean simple-row"
  >
    <div className="desktop-cart-row-name">{item.name}</div>

    <div className="desktop-cart-actions">
      <div
        className="desktop-cart-row-qty"
        onClick={() => {
          const value = prompt(`Vendos sasinë për ${item.name}`, item.qty);

          if (value === null) return;

          const qty = Number(value);

          if (isNaN(qty) || qty <= 0) {
            alert("Vendos një numër valid.");
            return;
          }

          setCart((prev) =>
            prev.map((p) =>
              String(p.productId) === String(item.productId)
                ? { ...p, qty }
                : p
            )
          );
        }}
      >
        {item.qty}×
      </div>

      <button
        type="button"
        className="desktop-cart-row-remove"
        onClick={() => removeFromCart(item.productId)}
      >
        ×
      </button>
    </div>
  </div>
))
              )}
            </div>



<div className="desktop-total-box modern">
  <span>TOTALI</span>
  <strong>
    {cartTotal.toFixed(2)} ALL
  </strong>
</div>

            <div className="desktop-bottom-actions">
  <button
    type="button"
    className="bottom-action-btn printo"
    onClick={printDirect}
    disabled={!selectedTable || cart.length === 0}
  >
     PRINTO
  </button>

  <button
    type="button"
    className="bottom-action-btn fature"
    onClick={() => handleSubmitOrder("fature")}
    disabled={!selectedTable || cart.length === 0}
  >
     FISKALIZIM
  </button>

  <button
    type="button"
    className="bottom-action-btn notes"
    onClick={() => {
      const value = window.prompt("Shënim për porosinë:", orderNote);
      if (value !== null) setOrderNote(value);
    }}
  >
     NOTES{orderNote ? " •" : ""}
  </button>

  <button
    type="button"
    className="bottom-action-btn pastro"
    onClick={clearCart}
    disabled={cart.length === 0}
  >
     PASTRO
  </button>
</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
