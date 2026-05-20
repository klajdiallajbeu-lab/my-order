import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./WaiterPage.css";
import { getProducts } from "../../api/productApi.js";
import { api } from "../../api/http.js";
import { createOrder } from "../../api/ordersApi.js";

const CURRENT_WAITER_NAME =
  sessionStorage.getItem("waiterName") || "Kamarjer 1";

const CURRENT_WAITER_ID =
  sessionStorage.getItem("waiterId") ||
  localStorage.getItem("waiterId") ||
  "";

export default function WaiterTableOrderPage() {
  const navigate = useNavigate();
  const { tableNumber } = useParams();

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderNote, setOrderNote] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategoryType, setSelectedCategoryType] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  const [printerSettings, setPrinterSettings] = useState({
    kitchenPrinterName: "",
    barPrinterName: "",
    invoicePrinterName: "",
  });

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const safeProducts = Array.isArray(products) ? products : [];

  const productMapById = useMemo(() => {
    const map = new Map();
    safeProducts.forEach((p) => {
      map.set(String(p._id), p);
    });
    return map;
  }, [safeProducts]);
  const totalItems = useMemo(
  () =>
    cart.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    ),
  [cart]
);

const totalPrice = useMemo(
  () =>
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 0) *
          Number(item.price || 0),
      0
    ),
  [cart]
);

  const fetchProducts = useCallback(async () => {
    if (!businessId) {
      setError("Mungon businessId. Hyni përsëri.");
      setLoadingProducts(false);
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

  const fetchPrinterSettings = useCallback(async () => {
    if (!businessId) return;

    try {
      const res = await api.get(`/business/${businessId}/settings`);
      const settings = res?.data?.settings || {};

      setPrinterSettings({
        kitchenPrinterName: settings.kitchenPrinterName || "",
        barPrinterName: settings.barPrinterName || "",
        invoicePrinterName: settings.invoicePrinterName || "",
      });
    } catch (err) {
      console.error(
        "Gabim te printer settings:",
        err?.response?.data || err
      );
    }
  }, [businessId]);

  useEffect(() => {
    fetchProducts();
    fetchPrinterSettings();
  }, [fetchProducts, fetchPrinterSettings]);

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

      if (existing.quantity === 1) {
        return prev.filter((i) => i._id !== productId);
      }

      return prev.map((i) =>
        i._id === productId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

const buildPayload = () => ({
  businessId,
  sourceType: "tavoline",
  sourceNumber: String(tableNumber || "").trim(),
  printSource: "phone",
  note: orderNote.trim(),
  items: cart.map((item) => {
      const original = productMapById.get(String(item._id));
      return {
        productId: item._id,
        name: item.name,
        price: item.price,
        qty: item.quantity,
        destination: original?.destination || "",
      };
    }),
    total: totalPrice,
    createdBy: CURRENT_WAITER_NAME,
  });

  const ensureQzConnection = async () => {
    if (!window.qz) {
      alert("QZ Tray nuk u gjet.");
      return false;
    }

    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }

    return true;
  };

  const formatLine = (left, right, width = 26) => {
    let l = String(left || "").trim();
    const r = String(right || "").trim();

    const maxLeft = width - r.length - 1;

    if (maxLeft <= 0) return `${l}\n${r}\n`;

    if (l.length > maxLeft) {
      l = l.slice(0, maxLeft);
    }

    return `${l}${" ".repeat(width - l.length - r.length)}${r}\n`;
  };

  const convertFromALL = (amount, rate, code) => {
    const r = Number(rate);
    if (!r || r <= 0) return "-";
    return `${(Number(amount) / r).toFixed(2)} ${code}`;
  };

  const buildPrintDataForOrder = (
    order,
    itemsOverride = null,
    title = "FATURE"
  ) => {
    const businessName =
      localStorage.getItem("hotelName") ||
      order?.business?.name ||
      "Biznesi";

    const nipt = localStorage.getItem("nipt") || order?.business?.nipt || "";

    const address =
      localStorage.getItem("address") || order?.business?.address || "";

    const waiterName =
      order?.acceptedBy ||
      order?.createdBy ||
      sessionStorage.getItem("waiterName") ||
      localStorage.getItem("name") ||
      "-";

    const sourceNumber = String(order?.sourceNumber || "-").trim();

    const printedDate = new Date(
      order?.createdAt || Date.now()
    ).toLocaleString("sq-AL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const items = Array.isArray(itemsOverride) ? itemsOverride : order?.items || [];

    const noteText = String(order?.note || "").trim();

    const totalNumber = items.reduce(
      (sum, it) => sum + Number(it?.qty || 0) * Number(it?.price || 0),
      0
    );
    const total = totalNumber.toFixed(0);

    const settings = {
      eurRate: Number(order?.business?.settings?.eurRate || 0),
      usdRate: Number(order?.business?.settings?.usdRate || 0),
      gbpRate: Number(order?.business?.settings?.gbpRate || 0),
      chfRate: Number(order?.business?.settings?.chfRate || 0),
    };

    const eurText = convertFromALL(totalNumber, settings.eurRate, "EUR");
    const usdText = convertFromALL(totalNumber, settings.usdRate, "USD");
    const gbpText = convertFromALL(totalNumber, settings.gbpRate, "GBP");
    const chfText = convertFromALL(totalNumber, settings.chfRate, "CHF");

    const line = "--------------------------\n";

    const itemsLines = items.map((it) => {
      const qty = Number(it?.qty) || 0;
      const itemName = String(it?.name || "Artikull").trim();
      const right = `${(qty * Number(it?.price || 0)).toFixed(0)} ALL`;
      return formatLine(`${qty}x ${itemName}`, right);
    });

    return [
      "\x1B\x40",
      "\x1B\x4D\x00",
      "\x1D\x21\x00",

      "\x1B\x61\x01",
      `${businessName}\n`,
      ...(nipt ? [`NIPT: ${nipt}\n`] : []),
      ...(address ? [`${address}\n`] : []),
      `\n${title}\n\n`,

      "\x1B\x61\x00",
      line,
`Tavolina: ${sourceNumber}\n`,
`Kamarier: ${waiterName}\n`,
`Data: ${printedDate}\n`,

...(noteText
  ? [
      line,
      "SHENIM:\n",
      `${noteText}\n`,
    ]
  : []),

line,

      ...itemsLines,

      line,
      formatLine("TOTAL:", `${total} ALL`),
      line,
      formatLine("EUR:", eurText),
      formatLine("USD:", usdText),
      formatLine("GBP:", gbpText),
      formatLine("CHF:", chfText),

      "\x1B\x61\x01",
      "\nJu Faleminderit!\n",
      "www.myOrder.al\n",
      "\n\n\n",
    ];
  };

  const getOrderItemDestination = (item) => {
    const productId = String(item?.productId || item?._id || "").trim();
    const product = productMapById.get(productId);

    const rawDestination =
      product?.destination ||
      item?.destination ||
      item?.categoryDestination ||
      "";

    return String(rawDestination).trim().toLowerCase();
  };

  const printSingleOrder = async (order) => {
    const connected = await ensureQzConnection();
    if (!connected) return;

    const items = Array.isArray(order?.items) ? order.items : [];

    const noteText = String(order?.note || "").trim();

    const kitchenItems = items.filter(
      (it) => getOrderItemDestination(it) === "kuzhine"
    );

    const barItems = items.filter(
      (it) => getOrderItemDestination(it) === "banak"
    );

    const unknownItems = items.filter((it) => {
      const d = getOrderItemDestination(it);
      return d !== "kuzhine" && d !== "banak";
    });

    if (kitchenItems.length > 0) {
      if (!printerSettings.kitchenPrinterName) {
        alert("Nuk është zgjedhur printeri i kuzhinës.");
        return;
      }

      const kitchenConfig = window.qz.configs.create(
        printerSettings.kitchenPrinterName
      );

      const kitchenData = buildPrintDataForOrder(
        { ...order, destination: "kuzhine" },
        kitchenItems,
        "POROSI KUZHINE"
      );

      await window.qz.print(kitchenConfig, kitchenData);
    }

    if (barItems.length > 0) {
      if (!printerSettings.barPrinterName) {
        alert("Nuk është zgjedhur printeri i barit.");
        return;
      }

      const barConfig = window.qz.configs.create(
        printerSettings.barPrinterName
      );

      const barData = buildPrintDataForOrder(
        { ...order, destination: "banak" },
        barItems,
        "POROSI BAR"
      );

      await window.qz.print(barConfig, barData);
    }

    if (
      unknownItems.length > 0 ||
      (kitchenItems.length === 0 && barItems.length === 0)
    ) {
      if (!printerSettings.invoicePrinterName) {
        alert("Nuk është zgjedhur printeri i faturës.");
        return;
      }

      const fallbackConfig = window.qz.configs.create(
        printerSettings.invoicePrinterName
      );

      const fallbackData = buildPrintDataForOrder(
        order,
        unknownItems.length > 0 ? unknownItems : items,
        "FATURE"
      );

      await window.qz.print(fallbackConfig, fallbackData);
    }
  };

  const handleSubmit = async (mode = "print") => {
    if (!businessId) {
      alert("Mungon businessId.");
      return;
    }

    if (!CURRENT_WAITER_ID) {
      alert("Mungon waiterId.");
      return;
    }

    if (!tableNumber) {
      alert("Mungon tavolina.");
      return;
    }

    if (cart.length === 0) {
      alert("Shto të paktën një produkt.");
      return;
    }

    try {
      const res = await createOrder(buildPayload());
      const created = res?.data;

      // 🔥 OCCUPY TABLE PAS POROSISË
try {
const resPlaces = await api.get("/places", {
  params: {
    businessId,
    type: "table", // 🔥 KJO MUNGONTE
  },
});

  const place = (resPlaces.data || []).find(
    (p) =>
      String(p.code || "").trim() ===
      String(tableNumber || "").trim()
  );
  if (!place) {
  console.warn("❌ Place nuk u gjet");
} else {
  console.log("📍 Table found:", place);

  try {
    const resOcc = await api.patch(`/places/${place._id}/occupy`, {
      type: "table",
      waiterId: CURRENT_WAITER_ID,
    });

    console.log("✅ Occupy OK:", resOcc.data);
  } catch (err) {
    console.error(
      "❌ Occupy FAILED:",
      err?.response?.data || err.message
    );
  }
}
} catch (err) {
  console.error("Occupy error:", err);
}

      if (!created) {
        throw new Error("Porosia nuk u kthye nga serveri.");
      }

      const orderToUse = Array.isArray(created) ? created[0] : created;

      if (mode === "print") {
  // Mos printo nga telefoni
}

      setCart([]);
      alert(
        mode === "print"
  ? "Porosia u dërgua me sukses."
  : "Fatura u krijua."
      );

      navigate("/waiter", { replace: true });
    } catch (err) {
      console.error("Gabim te porosia:", err?.response?.data || err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Nuk mund të dërgoj porosinë."
      );
    }
  };

  return (
    <div className="waiter-page">
      <header className="waiter-header">
        <div className="waiter-header-top">
          <div className="waiter-header-left">
            <h1>Tavolina {tableNumber}</h1>
            <span className="waiter-subtitle">
              Zgjidh produktet dhe dërgo porosinë
            </span>
          </div>

          <div className="waiter-header-actions">
            <button
              type="button"
              className="waiter-settings-icon"
              onClick={() => navigate("/waiter")}
              title="Kthehu"
            >
              ←
            </button>
          </div>
        </div>
      </header>

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
  const firstSub = categoryMap[cat]?.[0] || null;
  setSelectedSubCategory(firstSub);
}}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        {selectedCategoryType && subCategoriesForSelected.length > 0 && (
  <div className="waiter-subcategory-dropdown">
    <select
      value={selectedSubCategory || ""}
      onChange={(e) => setSelectedSubCategory(e.target.value)}
    >
      <option value="">Zgjidh nën-kategorinë</option>

      {subCategoriesForSelected.map((sub) => (
        <option key={sub} value={sub}>
          {sub}
        </option>
      ))}
    </select>
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
              <p style={{ marginTop: "1rem" }}>
                Nuk ka produkte në këtë nën-kategori.
              </p>
            )}

          {!selectedCategoryType && !loadingProducts && !error && (
            <p style={{ marginTop: "1rem" }}>
              Zgjidh një kategori për të parë produktet.
            </p>
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

          <div style={{ marginBottom: "10px" }}>
            Tavolina e zgjedhur: <b>{tableNumber}</b>
          </div>
          <button
  type="button"
  className={`waiter-note-btn ${orderNote.trim() ? "has-note" : ""}`}
  onClick={() => {
    const value = prompt("Shkruaj shënimin për porosinë:", orderNote);

    if (value === null) return;

    setOrderNote(value);
  }}
>
  ✎ {orderNote.trim() ? "Note u shtua" : "Shto note"}
</button>

          {cart.length === 0 && <p>S’ka produkte në porosi.</p>}
          {cart.map((item) => (
  <div key={item._id} className="waiter-cart-row">
    <span>
      <button
        type="button"
        className="waiter-qty-btn"
        onClick={() => {
          const value = prompt(
            `Vendos sasinë për ${item.name}`,
            item.quantity
          );

          if (value === null) return;

          const qty = Number(
            String(value).replace(",", ".")
          );

          if (!qty || qty <= 0) {
            alert("Sasia nuk është e saktë.");
            return;
          }

          setCart((prev) =>
            prev.map((p) =>
              p._id === item._id
                ? { ...p, quantity: qty }
                : p
            )
          );
        }}
      >
        {Number(item.quantity)}x
      </button>{" "}
      {item.name}
    </span>

    <div className="waiter-cart-actions">
      <button
        type="button"
        onClick={() => removeFromCart(item._id)}
      >
        -
      </button>
      <span>
  {(
    Number(item.quantity || 0) *
    Number(item.price || 0)
  ).toFixed(2)}{" "}
  ALL
</span>
    </div>
  </div>
))}

          {cart.length > 0 && (
            <div className="waiter-cart-footer">
              <span>Total: {totalPrice.toFixed(2)} ALL</span>

              <div className="waiter-cart-actions-2">
                <button
                  type="button"
                  className="waiter-print-btn"
                  onClick={() => handleSubmit("print")}
                >
                  Printo
                </button>

                <button
                  type="button"
                  className="waiter-invoice-btn"
                  onClick={() => handleSubmit("invoice")}
                >
                  Faturë
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}