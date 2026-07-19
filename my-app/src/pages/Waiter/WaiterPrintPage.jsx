import "../../qz-signing";
import { useEffect, useState } from "react";
import { api } from "../../api/http.js";
import "./WaiterPrintPage.css";

export default function WaiterPrintPage() {
  const [cart, setCart] = useState([]);
  const [orderNote, setOrderNote] = useState("");
  const [table, setTable] = useState("");

  const businessId = localStorage.getItem("businessId");
  const waiterId = localStorage.getItem("waiterId");
  const waiterName = localStorage.getItem("waiterName");

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("printCart") || "[]");
    const savedTable = localStorage.getItem("printTable") || "";

    setCart(
      savedCart.map((item) => ({
        ...item,
        qty: Number(item.qty) || 1,
        price: Number(item.price) || 0,
      }))
    );

    setTable(savedTable);
  }, []);

const updateQty = (productId, value) => {
  setCart((prev) =>
    prev.map((item) =>
      item.productId === productId
        ? { ...item, qty: value }
        : item
    )
  );
};

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.qty || 0),
    0
  );

  const handleSend = async (mode) => {
    if (!table) return ("Zgjidh tavolinën");
    if (!cart.length) return ("Ska produkte");

    const cleanCart = cart
      .map((item) => ({
        ...item,
        qty: Number(item.qty) || 0,
        price: Number(item.price) || 0,
      }))
      .filter((item) => item.qty > 0);

    if (!cleanCart.length) {
      return ("Vendos sasinë e produktit.");
    }

    try {
      await api.post(
        "/orders",
        {
          businessId,
          sourceType: "tavoline",
          sourceNumber: table,
          waiterId,
          createdBy: waiterName,
          printMode: mode,
          items: cleanCart,
          total,
          totalALL: total,
        },
        {

        }
      );

      ("U dërgua për printim ✅");

      localStorage.removeItem("printCart");
      localStorage.removeItem("printTable");
    } catch (err) {
      console.error(err);
      ("Gabim në printim");
    }
  };

  return (
    <div className="print-page">
      <h2>Printimi • Tavolina {table}</h2>

      <div className="print-list">
        {cart.map((item) => (
          <div key={item.productId} className="print-row">
            <span>{item.name}</span>
            <input
  className="print-qty-input"
  type="text"
  inputMode="decimal"
  value={item.qty}
  onChange={(e) => {
    const value = e.target.value.replace(",", ".");

    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      updateQty(item.productId, value);
    }
  }}
  onBlur={(e) => {
    const qty = Number(String(e.target.value).replace(",", "."));

    if (!qty || qty <= 0) {
      updateQty(item.productId, 1);
    } else {
      updateQty(item.productId, qty);
    }
  }}
/>

            <span>
              {(Number(item.price || 0) * Number(item.qty || 0)).toFixed(2)} ALL
            </span>
          </div>
        ))}
      </div>

      <div className="print-total">
        TOTAL: {total.toFixed(2)} ALL
      </div>

      <div className="print-actions">
        <button onClick={() => handleSend("printo")}>
          PRINTO
        </button>

        <button onClick={() => handleSend("fature")}>
          FATURË
        </button>
      </div>
    </div>
  );
}