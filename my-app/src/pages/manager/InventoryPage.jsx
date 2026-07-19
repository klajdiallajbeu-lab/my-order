import "../../qz-signing";
import { useEffect, useMemo, useState } from "react";
import { getInventorySummary } from "../../api/inventoryApi.js";
import "./InventoryPage.css";

const DASHBOARD_FROM_KEY = "dashboard_from_date";
const DASHBOARD_TO_KEY = "dashboard_to_date";

const getBusinessId = () => {
  return (localStorage.getItem("businessId") || "").trim();
};

const getSavedRange = () => {
  const from = localStorage.getItem(DASHBOARD_FROM_KEY);
  const to = localStorage.getItem(DASHBOARD_TO_KEY);

  return {
    from: from ? new Date(from) : null,
    to: to ? new Date(to) : null,
  };
};

const formatDate = (date) => {
  if (!date || Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [totalProductsWithSales, setTotalProductsWithSales] = useState(0);
  const [totalQuantitySold, setTotalQuantitySold] = useState(0);

  const savedRange = getSavedRange();
  const hasRange = savedRange.from && savedRange.to;

  const periodLabel = hasRange
    ? `${savedRange.from.toLocaleDateString()} – ${savedRange.to.toLocaleDateString()}`
    : "Gjithë periudha";

  const loadInventory = async () => {
    try {
      setLoading(true);

      const businessId = getBusinessId();

      if (!businessId) {
        ("Mungon businessId. Dil dhe hyr sërish.");
        return;
      }

      const { from, to } = getSavedRange();

      const data = await getInventorySummary({
        businessId,
        from: formatDate(from),
        to: formatDate(to),
      });

      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalProductsWithSales(Number(data.totalProductsWithSales || 0));
      setTotalQuantitySold(Number(data.totalQuantitySold || 0));
    } catch (err) {
      console.error("Gabim te InventoryPage:", err.response?.data || err);
      setItems([]);
      setTotalProductsWithSales(0);
      setTotalQuantitySold(0);
      (err.response?.data?.message || "Nuk u lexua inventari nga serveri.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const inventoryList = useMemo(() => {
    return (items || []).map((it) => ({
      id: String(it.productId || it._id || it.productName),
      name: String(it.productName || it.name || "").trim(),
      categoryType: it.categoryType || "",
      price: Number(it.price || 0),
      supplied: Number(it.supplied || 0),
      sold: Number(it.sold || 0),
      remaining: Number(it.remaining || 0),
    }));
  }, [items]);

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventoryList;

    return inventoryList.filter((item) =>
      item.name.toLowerCase().includes(q)
    );
  }, [inventoryList, search]);

  const topProduct = useMemo(() => {
    const soldItems = inventoryList.filter((x) => x.sold > 0);
    if (!soldItems.length) return null;

    return [...soldItems].sort((a, b) => b.sold - a.sold)[0];
  }, [inventoryList]);

  return (
    <div className="inventory-container">
      <div className="inventory-header-card">
        <div>
          
          <h1 className="inventory-title">Inventari i Shitjeve</h1>
          <p className="inventory-period">
            Periudha: <b>{periodLabel}</b>
          </p>
        </div>

        <div className="inventory-header-actions">
          <input
            className="inventory-search"
            type="text"
            placeholder="Kërko produkt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearch("");
            }}
          />

          <button
            type="button"
            className="inventory-refresh-btn"
            onClick={loadInventory}
            disabled={loading}
          >
            Rifresko
          </button>
        </div>
      </div>

      <div className="inventory-summary">
        <div className="inventory-summary-card">
          <span className="label">Produkte me shitje</span>
          <span className="value">{totalProductsWithSales}</span>
        </div>

        <div className="inventory-summary-card">
          <span className="label">Sasia totale e shitur</span>
          <span className="value">{totalQuantitySold}</span>
        </div>

        <div className="inventory-summary-card">
          <span className="label">Produkti më i shitur</span>
          <span className="value small">
            {topProduct ? topProduct.name : "—"}
          </span>
          {topProduct ? (
            <span className="mini-label">{topProduct.sold} shitje</span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="empty-text">Duke ngarkuar inventarin...</p>
      ) : inventoryList.length === 0 ? (
        <p className="empty-text">Nuk ka produkte në inventar.</p>
      ) : filteredInventory.length === 0 ? (
        <p className="empty-text">Nuk u gjet asnjë produkt për “{search}”.</p>
      ) : (
        <div className="inventory-list">
          {filteredInventory.map((item) => (
            <div key={item.id} className="inventory-item">
              <div className="inventory-item-left">
                <div className="inventory-icon-box">▦</div>

                <div>
                  <div className="inventory-item-name">{item.name}</div>

                  <div className="inventory-item-qty">
                    <span>Shitur: {item.sold}</span>
                  </div>
                </div>
              </div>

              <div className="inventory-sold-badge">
                {item.sold}
                <span> copë</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}