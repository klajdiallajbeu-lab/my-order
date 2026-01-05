// src/pages/manager/OrderDetailsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrderById } from "../../api/ordersApi.js";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const isValidMongoId = useMemo(() => {
    const v = String(id || "").trim();
    return /^[a-f\d]{24}$/i.test(v);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setErr("");

        if (!id || id === "undefined") {
          throw new Error("ID i porosisë mungon në URL.");
        }
        if (!isValidMongoId) {
          throw new Error("ID i porosisë nuk është valid (duhet 24 karaktere).");
        }

        const res = await getOrderById(id); // GET /api/orders/:id

        if (cancelled) return;
        setOrder(res?.data || null);
      } catch (e) {
        if (cancelled) return;

        const status = e?.response?.status;
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Gabim gjatë hapjes së faturës.";

        // mesazh më i qartë
        if (status === 404) {
          setErr("❌ Fatura nuk u gjet (mund të jetë fshirë ose ID s’është i saktë).");
        } else {
          setErr(`❌ ${msg}`);
        }

        setOrder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isValidMongoId]);

  if (loading) {
    return <div style={{ padding: 20 }}>Duke ngarkuar faturën...</div>;
  }

  if (err) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={() => navigate(-1)}>← Back</button>
        <h2>Fatura</h2>
        <p style={{ marginTop: 12, color: "salmon" }}>{err}</p>

        <div style={{ marginTop: 12 }}>
          <button onClick={() => navigate("/manager/orders")}>Shko te Porositë</button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)}>← Back</button>

      <h2 style={{ marginTop: 10 }}>Fatura</h2>

      <p>
        <b>ID:</b> {order._id}
      </p>
      <p>
        <b>Burimi:</b> {order.sourceType} {order.sourceNumber}
      </p>
      <p>
        <b>Status:</b> {order.status || "pending"}{" "}
        {order.acceptedBy ? `(nga ${order.acceptedBy})` : ""}
      </p>
      <p>
        <b>Total:</b> {(Number(order.total) || 0).toFixed(2)} €
      </p>

      <h3 style={{ marginTop: 16 }}>Artikujt</h3>

      {order.items?.length ? (
        order.items.map((it, idx) => (
          <div key={idx} style={{ padding: "6px 0", borderBottom: "1px solid #222" }}>
            {Number(it.qty) || 0}x {it.name} — {(Number(it.price) || 0).toFixed(2)} €
          </div>
        ))
      ) : (
        <p>Nuk ka artikuj.</p>
      )}
    </div>
  );
}
