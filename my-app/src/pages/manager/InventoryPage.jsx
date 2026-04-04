// src/pages/manager/InventoryPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getInventorySummary, addSupplyApi } from "../../api/inventoryApi.js";
import { getProductsApi } from "../../api/InventoryProductsApi.js";
import "./InventoryPage.css";

const BUSINESS_ID = (localStorage.getItem("businessId") || "").trim();

const DASHBOARD_FROM_KEY = "dashboard_from_date";
const DASHBOARD_TO_KEY = "dashboard_to_date";

const getSavedRange = () => {
  const from = localStorage.getItem(DASHBOARD_FROM_KEY);
  const to = localStorage.getItem(DASHBOARD_TO_KEY);
  return {
    from: from ? new Date(from) : null,
    to: to ? new Date(to) : null,
  };
};

const formatDate = (date) => (date ? date.toISOString().slice(0, 10) : null);

const productLabel = (p) =>
  String(p?.nameSq || p?.name || p?.title || "").trim() || "Produkt";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);

  // page search
  const [search, setSearch] = useState("");

  const [totalProductsWithSales, setTotalProductsWithSales] = useState(0);
  const [totalQuantitySold, setTotalQuantitySold] = useState(0);

  const [selectedProductId, setSelectedProductId] = useState(null);
  const [loading, setLoading] = useState(false);

  // modal supply
  const [showSupplyForm, setShowSupplyForm] = useState(false);
  const [supplyProductId, setSupplyProductId] = useState("");
  const [supplyQty, setSupplyQty] = useState("");
  const [supplyUnitPrice, setSupplyUnitPrice] = useState("");
  const [supplyNote, setSupplyNote] = useState("");

  // searchable picker states
  const [productQuery, setProductQuery] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const pickerRef = useRef(null);

  const savedRange = getSavedRange();
  const hasRange = savedRange.from && savedRange.to;
  const periodLabel = hasRange
    ? `${savedRange.from.toLocaleDateString()} – ${savedRange.to.toLocaleDateString()}`
    : "Gjithë periudha";

  const loadInventory = async () => {
    try {
      setLoading(true);
      const { from, to } = getSavedRange();

      const data = await getInventorySummary({
        businessId: BUSINESS_ID,
        from: formatDate(from),
        to: formatDate(to),
      });

      setItems(data.items || []);
      setTotalProductsWithSales(data.totalProductsWithSales || 0);
      setTotalQuantitySold(data.totalQuantitySold || 0);
    } catch (err) {
      console.error("❌ Gabim te InventoryPage:", err.response?.data || err);
      setItems([]);
      setTotalProductsWithSales(0);
      setTotalQuantitySold(0);
      alert("Nuk u lexua inventari nga serveri.");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProductsApi({ businessId: BUSINESS_ID });
      const list = data.items || data || [];
      setProducts(list);
    } catch (err) {
      console.error("❌ Gabim te loadProducts:", err.response?.data || err);
      setProducts([]);
    }
  };

  useEffect(() => {
    loadProducts();
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // close product dropdown on outside click
  useEffect(() => {
  const onDown = (e) => {
    if (!pickerRef.current) return;
    if (!pickerRef.current.contains(e.target)) setProductOpen(false);
  };
  document.addEventListener("pointerdown", onDown);
  return () => document.removeEventListener("pointerdown", onDown);
}, []);


  // normalizo items -> listë për UI
  const inventoryList = useMemo(() => {
    return (items || []).map((it) => ({
      id: String(it.productId || ""),
      name: String(it.productName || it.name || it.nameSq || it.nameEn || it.nameIt || "").trim(),
      sold: Number(it.sold || 0),
      supplied: Number(it.supplied || 0),
      remaining: Number(it.remaining || 0),
    }));
  }, [items]);

  // FILTER (search on page)
  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventoryList;
    return inventoryList.filter((item) => String(item.name || "").toLowerCase().includes(q));
  }, [inventoryList, search]);

  const selectedItem = useMemo(() => {
    if (!selectedProductId) return null;
    return inventoryList.find((p) => p.id === selectedProductId) || null;
  }, [inventoryList, selectedProductId]);

  // Selected product label in modal
  const selectedSupplyProduct = useMemo(() => {
    if (!supplyProductId) return null;
    return (products || []).find((p) => String(p._id) === String(supplyProductId)) || null;
  }, [products, supplyProductId]);

  const selectedSupplyName = selectedSupplyProduct ? productLabel(selectedSupplyProduct) : "";

  // Filter products for modal dropdown (limit for performance)
  const filteredProducts = useMemo(() => {
  const q = productQuery.trim().toLowerCase();
  const list = products || [];

  // ✅ mos shfaq asgjë derisa të ketë 2+ shkronja
  if (q.length < 2) return [];

  // ✅ startsWith (fillon me)
  return list
    .filter((p) => productLabel(p).toLowerCase().startsWith(q))
    .slice(0, 80);
}, [products, productQuery]);


  const resetSupplyForm = () => {
    setSupplyProductId("");
    setSupplyQty("");
    setSupplyUnitPrice("");
    setSupplyNote("");
    setProductQuery("");
    setProductOpen(false);
  };

  const openSupplyModal = () => {
    setShowSupplyForm(true);
    resetSupplyForm();
  };

  const handleAddSupply = async (e) => {
    e.preventDefault();

    if (!supplyProductId || !supplyQty) {
      return alert("Zgjidh produktin dhe vendos sasinë.");
    }

    const qtyNum = Number(supplyQty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      return alert("Sasia duhet të jetë numër > 0.");
    }

    try {
      await addSupplyApi({
        businessId: BUSINESS_ID,
        productId: supplyProductId,
        qty: qtyNum,
        unitPrice: supplyUnitPrice ? Number(supplyUnitPrice) : 0,
        note: supplyNote,
      });

      setShowSupplyForm(false);
      resetSupplyForm();
      await loadInventory();
    } catch (err) {
      console.error("❌ Gabim te addSupply:", err.response?.data || err);
      alert("Nuk u shtua stoku. Kontrollo serverin.");
    }
  };

  return (
    <div className="inventory-container">
      {/* HEADER */}
      <div className="inventory-header-card">
        <div>
          <h1 className="inventory-title">Inventari i Produkteve</h1>
          <p className="inventory-period">
            Periudha: <b>{periodLabel}</b>
          </p>
        </div>

        <div className="inventory-header-actions">
          <input
            className="inventory-search"
            type="text"
            placeholder="Kërko produkt…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearch("");
            }}
          />

          <button className="add-stock-btn" onClick={openSupplyModal}>
            + Shto stok
          </button>
        </div>
      </div>

      {/* MODAL */}
      {showSupplyForm && (
        <div className="supply-modal" onClick={() => setShowSupplyForm(false)}>
          <div className="supply-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Shto stok</h2>

            <form onSubmit={handleAddSupply} className="supply-form">
              {/* SEARCHABLE PRODUCT PICKER */}
              <label>
                <div
  className={`product-picker ${productOpen ? "open" : ""}`}

  ref={pickerRef}
>

                  <input
  type="text"
  value={productQuery}
  onChange={(e) => {
    const v = e.target.value;
    setProductQuery(v);

    // ✅ hap vetëm kur ka 2+ shkronja
    setProductOpen(v.trim().length >= 2);
  }}
  onFocus={() => {
    // ✅ mos hap asgjë në fokus; hap vetëm nëse ka 2+ shkronja tashmë
    setProductOpen(productQuery.trim().length >= 2);
  }}
/>


                  <div className="product-picker-right">
                    {supplyProductId ? (
                      <button
                        type="button"
                        className="pp-clear"
                        onClick={() => {
  setSupplyProductId("");
  setProductQuery("");
  setProductOpen(false);
}}

                        title="Hiq zgjedhjen"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                  {productOpen && !supplyProductId && productQuery.trim().length >= 2 && (
  <div className="product-dropdown" onPointerDown={(e) => e.stopPropagation()}>
    {filteredProducts.length === 0 ? (
      <div className="product-empty">S’u gjet asnjë produkt.</div>
    ) : (
      filteredProducts.map((p) => {
        const id = String(p._id);
        const name = productLabel(p);
        const active = id === String(supplyProductId);

        return (
          <button
            key={id}
            type="button"
            className={`product-option ${active ? "active" : ""}`}
            onClick={() => {
              setSupplyProductId(id);
              setProductQuery(name);
              setProductOpen(false); // ✅ mbyll dropdown
            }}
          >
            <span className="po-name">{name}</span>
          </button>
        );
      })
    )}
  </div>
)}


                </div>
              </label>

              <label>
                Sasia (qty)
                <input
                  type="number"
                  min="1"
                  value={supplyQty}
                  onChange={(e) => setSupplyQty(e.target.value)}
                />
              </label>

              <label>
                Çmimi për copë (opsionale)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={supplyUnitPrice}
                  onChange={(e) => setSupplyUnitPrice(e.target.value)}
                />
              </label>

              <label>
                Shënim (opsionale)
                <input
                  type="text"
                  value={supplyNote}
                  onChange={(e) => setSupplyNote(e.target.value)}
                />
              </label>

              <div className="supply-form-actions">
                <button type="button" onClick={() => setShowSupplyForm(false)}>
                  Anulo
                </button>
                <button type="submit">Ruaj stokun</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUMMARY */}
      {!selectedProductId && (
        <div className="inventory-summary">
          <div className="inventory-summary-card">
            <span className="label">Produkte me shitje:</span>
            <span className="value">{totalProductsWithSales}</span>
          </div>
          <div className="inventory-summary-card">
            <span className="label">Sasia totale e shitur:</span>
            <span className="value">{totalQuantitySold}</span>
          </div>
        </div>
      )}

      {loading ? (
        <p className="empty-text">Duke ngarkuar inventarin...</p>
      ) : (
        <>
          {/* LIST */}
          {!selectedProductId && (
            <>
              {inventoryList.length === 0 ? (
                <p className="empty-text">Nuk ka shitje në këtë periudhë.</p>
              ) : filteredInventory.length === 0 ? (
                <p className="empty-text">Nuk u gjet asnjë produkt për “{search}”.</p>
              ) : (
                <div className="inventory-list">
                  {filteredInventory.map((item) => {
                    const remaining = Number(item.remaining || 0);
                    const isOut = remaining <= 0;
                    const isLow = remaining > 0 && remaining <= 5;

                    return (
                      <div
                        key={item.id}
                        className={`inventory-item ${isOut ? "stock-out" : isLow ? "stock-low" : ""}`}
                        onClick={() => setSelectedProductId(item.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="inventory-item-name">{item.name}</div>

                        <div className="inventory-item-qty">
                          <span>{item.sold} shitje</span>
                          <span className="dot">•</span>
                          <span>{remaining} stok</span>

                          {isOut ? (
                            <span className="badge out">S’ka</span>
                          ) : isLow ? (
                            <span className="badge low">Pak</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* DETAILS */}
          {selectedProductId && selectedItem && (
            <>
              <button className="inner-back-btn" onClick={() => setSelectedProductId(null)}>
                ← Kthehu te lista
              </button>

              <h2 className="inventory-product-title">
                {selectedItem.name} – {selectedItem.sold} shitje
              </h2>

              <div className="inventory-summary">
                <div className="inventory-summary-card">
                  <span className="label">Totali i furnizuar:</span>
                  <span className="value">{selectedItem.supplied}</span>
                </div>
                <div className="inventory-summary-card">
                  <span className="label">Totali i shitur:</span>
                  <span className="value">{selectedItem.sold}</span>
                </div>
                <div className="inventory-summary-card">
                  <span className="label">Mbetur në stok:</span>
                  <span className="value">{selectedItem.remaining}</span>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
