import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrderById } from "../../api/ordersApi.js";
import "./OrderDetailsPage.css";
import "../../qz-signing";

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

        const res = await getOrderById(id);

        if (cancelled) return;
        setOrder(res?.data || null);
      } catch (e) {
        if (cancelled) return;

        const status = e?.response?.status;
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Gabim gjatë hapjes së faturës.";

        if (status === 404) {
          setErr("Fatura nuk u gjet (mund të jetë fshirë ose ID nuk është i saktë).");
        } else {
          setErr(msg);
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

const handlePrint = async () => {
  try {
    if (!order) return;

    if (!qz) {
      ("QZ Tray nuk u gjet.");
      return;
    }

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    const printer = "RONGTA RPP02 Series Printer(1)";
    const config = qz.configs.create(printer);

    const businessName =
      localStorage.getItem("hotelName") ||
      order?.business?.name ||
      "Biznesi";

    const nipt =
      localStorage.getItem("nipt") ||
      order?.business?.nipt ||
      "";

    const address =
      localStorage.getItem("address") ||
      order?.business?.address ||
      "";

    const sourceLabel =
      `${order?.sourceType || ""} ${order?.sourceNumber || ""}`.trim() || "-";

    const waiterName =
      order?.acceptedBy ||
      order?.createdBy ||
      localStorage.getItem("name") ||
      "-";

    const totalNumber = Number(order?.totalALL) || Number(order?.total) || 0;
    const total = totalNumber.toFixed(0);

    const printedDate = new Date(
      order?.createdAt || order?.updatedAt || Date.now()
    ).toLocaleString("sq-AL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const settings = order?.business?.settings || {};

    const eurRate = Number(settings?.eurRate) || 0;
    const usdRate = Number(settings?.usdRate) || 0;
    const gbpRate = Number(settings?.gbpRate) || 0;
    const chfRate = Number(settings?.chfRate) || 0;

    const convertFromALL = (amount, rate, code) => {
      if (!rate || rate <= 0) return "-";
      return `${(Number(amount) / Number(rate)).toFixed(2)} ${code}`;
    };

    const eurText = convertFromALL(totalNumber, eurRate, "EUR");
    const usdText = convertFromALL(totalNumber, usdRate, "USD");
    const gbpText = convertFromALL(totalNumber, gbpRate, "GBP");
    const chfText = convertFromALL(totalNumber, chfRate, "CHF");

    const LINE_WIDTH = 32;

    const padRight = (text, length) => {
      const str = String(text ?? "");
      if (str.length >= length) return str.slice(0, length);
      return str + " ".repeat(length - str.length);
    };

    const makeLeftRightLine = (left, right) => {
      const l = String(left ?? "");
      const r = String(right ?? "");

      if (r.length >= LINE_WIDTH) return `${r}\n`;

      const leftWidth = LINE_WIDTH - r.length;
      return `${padRight(l, leftWidth)}${r}\n`;
    };

    const splitText = (text, maxLen) => {
      const str = String(text || "");
      if (!str) return [""];
      if (str.length <= maxLen) return [str];

      const words = str.split(" ");
      const lines = [];
      let current = "";

      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (test.length <= maxLen) {
          current = test;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }

      if (current) lines.push(current);
      return lines.length ? lines : [str.slice(0, maxLen)];
    };

    const line = "--------------------------------\n";

    const itemsLines = (order.items || []).flatMap((it) => {
      const qty = Number(it?.qty) || 0;
      const itemName = String(it?.name || "Artikull").trim();
      const leftText = `${qty}x ${itemName}`;
      const rightText = `${(qty * (Number(it?.price) || 0)).toFixed(0)} ALL`;

      const leftMaxWidth = LINE_WIDTH - rightText.length;
      const wrappedNameLines = splitText(leftText, leftMaxWidth);

      return wrappedNameLines.map((part, index) => {
        if (index === 0) {
          return makeLeftRightLine(part, rightText);
        }
        return `${part}\n`;
      });
    });

    const data = [
      "\x1B\x40",

      "\x1B\x61\x01",
      `${businessName}\n`,
      ...(nipt ? [`NIPT: ${nipt}\n`] : []),
      ...(address ? [`${address}\n`] : []),
      "\nFATURE\n\n",

      "\x1B\x61\x00",
      line,
      `Burimi: ${sourceLabel}\n`,
      `Kamarier: ${waiterName}\n`,
      `Data: ${printedDate}\n`,
      line,

      ...itemsLines,

      line,
      makeLeftRightLine("TOTAL:", `${total} ALL`),
      line,
      makeLeftRightLine("EUR:", eurText),
      makeLeftRightLine("USD:", usdText),
      makeLeftRightLine("GBP:", gbpText),
      makeLeftRightLine("CHF:", chfText),

      "\x1B\x61\x01",
      "\nJu Faleminderit!\n",
      "www.myorderal.com\n",
      "\n\n\n",
    ];

    await qz.print(config, data);
  } catch (error) {
    console.error("Print error:", error);
    ("Gabim gjatë printimit.");
  }
};

  if (loading) {
    return <div className="order-details-container">Duke ngarkuar faturën...</div>;
  }

  if (err) {
    return (
      <div className="order-details-container">
        <button className="invoice-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="order-details-box">
          <h2 className="invoice-header">Fatura</h2>
          <p style={{ color: "salmon", marginTop: 12 }}>{err}</p>

          <div style={{ marginTop: 16 }}>
            <button className="print-btn" onClick={() => navigate("/manager/orders")}>
              Shko te Porositë
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

const total = Number(order.totalALL) || Number(order.total) || 0;

const invoiceNo = String(order.invoiceNumber || order.invoiceNo || 0).padStart(6, "0");

const waiterName =
  order?.acceptedByName ||
  order?.waiterName ||
  order?.createdBy ||
  "-";

return (
  <div className="invoice-modern-page">
    <button className="invoice-back-modern" onClick={() => navigate(-1)}>
      ← Kthehu
    </button>

    <section className="invoice-modern-card">
      <div className="invoice-modern-hero">
        <div>
          <h1>FATURA</h1>
          <p>Detajet e faturës</p>
        </div>

        <div className="invoice-modern-icon">▣</div>
      </div>

      <button className="invoice-print-modern" onClick={handlePrint}>
        🖨 Printo
      </button>

      <div className="invoice-info-grid">
        <div className="invoice-info-item">
          <span>#</span>
          <div>
            <small>Nr. Faturës </small>
            <strong>{invoiceNo}</strong>
          </div>
        </div>

        <div className="invoice-info-item">
          <span>▦</span>
          <div>
            <small>Burimi </small>
            <strong>{order.sourceType} {order.sourceNumber}</strong>
          </div>
        </div>

        <div className="invoice-info-item">
          <span>◷</span>
          <div>
            <small>Statusi  </small>
            <strong className="invoice-status-pill">{order.status || "pending"}</strong>
          </div>
        </div>

        <div className="invoice-info-item">
          <span>▰</span>
          <div>
            <small>Totali  </small>
            <strong className="invoice-blue">{total.toFixed(0)} ALL</strong>
          </div>
        </div>
      </div>

      <div className="invoice-items-card">
        <h2>Artikujt</h2>

        <div className="invoice-items-head">
          <span>Përshkrimi</span>
          <span>Sasia</span>
          <span>Çmimi</span>
          <span>Totali</span>
        </div>

        {(order.items || []).map((it, idx) => {
          const qty = Number(it.qty || 0);
          const price = Number(it.price || 0);

          return (
            <div key={idx} className="invoice-items-row">
              <span>{it.name}</span>
              <span>{qty}x</span>
              <span>{price.toFixed(0)} ALL</span>
              <strong>{(qty * price).toFixed(0)} ALL</strong>
            </div>
          );
        })}

        <div className="invoice-pay-total">
          <span>TOTALI PËR TË PAGUAR</span>
          <strong>{total.toFixed(0)} ALL</strong>
        </div>
      </div>

      <div className="invoice-footer-info">
        <div>
          <small>Data  </small>
          <strong>
            {new Date(order.createdAt || Date.now()).toLocaleString("sq-AL", {
              hour12: false,
            })}
          </strong>
        </div>

        <div>
          <small>Kamarieri   </small>
          <strong>{waiterName}</strong>
        </div>
      </div>

      <div className="invoice-thanks">
        <strong>Faleminderit!</strong>
        <span>www.myorderal.com</span>
      </div>
    </section>
  </div>
);
}