// src/pages/manager/InventoryPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getInventorySummary, addSupplyApi } from "../../api/inventoryApi.js";
import "./InventoryPage.css";

const BUSINESS_ID =
  localStorage.getItem("businessId");

const DASHBOARD_FROM_KEY = "dashboard_from_date";
const DASHBOARD_TO_KEY = "dashboard_to_date";

// lexon datat e ruajtura nga Dashboard
const getSavedRange = () => {
  const from = localStorage.getItem(DASHBOARD_FROM_KEY);
  const to = localStorage.getItem(DASHBOARD_TO_KEY);

  return {
    from: from ? new Date(from) : null,
    to: to ? new Date(to) : null,
  };
};

// kthen YYYY-MM-DD për API
const formatDate = (date) => {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
};

export default function InventoryPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [totalProductsWithSales, setTotalProductsWithSales] = useState(0);
  const [totalQuantitySold, setTotalQuantitySold] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  // formë për shtuar stok
  const [showSupplyForm, setShowSupplyForm] = useState(false);
  const [supplyProductName, setSupplyProductName] = useState("");
  const [supplyQty, setSupplyQty] = useState("");
  const [supplyUnitPrice, setSupplyUnitPrice] = useState("");
  const [supplyNote, setSupplyNote] = useState("");

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

  useEffect(() => {
    loadInventory();
  }, []);

  // lista e produkteve
  const inventoryList = items.map((item) => ({
    name: item.productName,
    sold: item.sold,
    remaining: item.remaining,
    supplied: item.supplied,
  }));

  const selectedItem = inventoryList.find(
    (p) => p.name === selectedProduct
  );

  const savedRange = getSavedRange();
  const hasRange = savedRange.from && savedRange.to;
  const periodLabel = hasRange
    ? `${savedRange.from.toLocaleDateString()} – ${savedRange.to.toLocaleDateString()}`
    : "Gjithë periudha";

  // shto stok
  const handleAddSupply = async (e) => {
    e.preventDefault();

    if (!supplyProductName.trim() || !supplyQty) {
      return alert("Vendos emrin e produktit dhe sasinë.");
    }

    try {
      await addSupplyApi({
        businessId: BUSINESS_ID,
        productName: supplyProductName.trim(),
        qty: Number(supplyQty),
        unitPrice: supplyUnitPrice ? Number(supplyUnitPrice) : 0,
        note: supplyNote,
      });

      // pastro formën
      setSupplyProductName("");
      setSupplyQty("");
      setSupplyUnitPrice("");
      setSupplyNote("");
      setShowSupplyForm(false);

      // rifresko inventarin
      await loadInventory();
    } catch (err) {
      console.error("❌ Gabim te addSupply:", err.response?.data || err);
      alert("Nuk u shtua stoku. Kontrollo serverin.");
    }
  };

  return (
    <div className="inventory-container">
      {/* HEADER */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/manager")}>
          ← Kthehu mbrapa
        </button>

        <div>
          <h1>📦 Inventari i Produkteve</h1>
          <p className="inventory-period">
            Periudha: <b>{periodLabel}</b>
          </p>
        </div>

        <button
          className="add-stock-btn"
          onClick={() => setShowSupplyForm(true)}
        >
          + Shto stok
        </button>
      </div>

      {/* MODAL PËR SHTUAR STOK */}
      {showSupplyForm && (
        <div className="supply-modal">
          <div className="supply-modal-content">
            <h2>Shto stok</h2>
            <form onSubmit={handleAddSupply} className="supply-form">
              <label>
                Emri i produktit
                <input
                  type="text"
                  value={supplyProductName}
                  onChange={(e) => setSupplyProductName(e.target.value)}
                  placeholder="p.sh. uje"
                />
              </label>

              <label>
                Sasia (qty)
                <input
                  type="number"
                  min="1"
                  value={supplyQty}
                  onChange={(e) => setSupplyQty(e.target.value)}
                  placeholder="p.sh. 20"
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
                  placeholder="p.sh. 0.3"
                />
              </label>

              <label>
                Shënim (opsionale)
                <input
                  type="text"
                  value={supplyNote}
                  onChange={(e) => setSupplyNote(e.target.value)}
                  placeholder="p.sh. furnizim nga X"
                />
              </label>

              <div className="supply-form-actions">
                <button
                  type="button"
                  onClick={() => setShowSupplyForm(false)}
                >
                  Anulo
                </button>
                <button type="submit">Ruaj stokun</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PËRMBLEDHJA KRYESORE */}
      {!selectedProduct && (
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
          {/* LISTA E PRODUKTEVE */}
          {!selectedProduct && (
            <>
              {inventoryList.length === 0 ? (
                <p className="empty-text">Nuk ka shitje në këtë periudhë.</p>
              ) : (
                <div className="inventory-list">
                  {inventoryList.map((item, i) => (
                    <div
                      key={i}
                      className="inventory-item"
                      onClick={() => setSelectedProduct(item.name)}
                    >
                      <div className="inventory-item-name">{item.name}</div>
                      <div className="inventory-item-qty">
                        {item.sold} shitje • {item.remaining} stok
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* DETAJE PËR NJË PRODUKT */}
          {selectedProduct && selectedItem && (
            <>
              <button
                className="inner-back-btn"
                onClick={() => setSelectedProduct(null)}
              >
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
