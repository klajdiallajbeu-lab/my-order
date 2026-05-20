import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WaiterXhiroDesktopPage.css";
import { api } from "../../api/http.js";
import {
  closeWaiterShiftApi,
  getWaiterShiftPreviewApi,
} from "../../api/ordersApi.js";

const CURRENT_WAITER_NAME =
  sessionStorage.getItem("waiterName") || "Kamarjer";

export default function WaiterXhiroDesktopPage() {
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [printerSettings, setPrinterSettings] = useState({
    invoicePrinterName: "",
  });

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const convertFromALL = (amount, rate, code) => {
    const r = Number(rate);
    if (!r || r <= 0) return "-";
    return `${(Number(amount) / r).toFixed(2)} ${code}`;
  };

  const formatLine = (left, right, width = 26) => {
    let l = String(left || "").trim();
    const r = String(right || "").trim();
    const maxLeft = width - r.length - 1;

    if (maxLeft <= 0) return `${l}\n${r}\n`;
    if (l.length > maxLeft) l = l.slice(0, maxLeft);

    return `${l}${" ".repeat(width - l.length - r.length)}${r}\n`;
  };

  const fetchPrinterSettings = useCallback(async () => {
    if (!businessId) return;

    try {
      const res = await api.get(`/business/${businessId}/settings`);
      const settings = res?.data?.settings || {};

      setPrinterSettings({
        invoicePrinterName: settings.invoicePrinterName || "",
      });
    } catch (err) {
      console.error("Gabim printer settings:", err?.response?.data || err);
    }
  }, [businessId]);

  const loadPreview = useCallback(async () => {
    if (!businessId) return;

    try {
      setLoading(true);

      const res = await getWaiterShiftPreviewApi({
        businessId,
        waiterName: CURRENT_WAITER_NAME,
      });

      setReport(res?.data?.report || null);
    } catch (err) {
      console.error("Gabim xhiro preview:", err?.response?.data || err);
      alert(err?.response?.data?.message || "Nuk mund të hap xhiron.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchPrinterSettings();
    loadPreview();
  }, [fetchPrinterSettings, loadPreview]);

  const ensureQzConnection = async () => {
    if (!window.qz) return false;

    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }

    return true;
  };

  const printShiftReport = async (shiftReport) => {
    const connected = await ensureQzConnection();
    if (!connected) {
      throw new Error("QZ Tray nuk është lidhur.");
    }

    const printer = printerSettings.invoicePrinterName;

    if (!printer) {
      throw new Error("Nuk është zgjedhur printeri i faturës.");
    }

    const config = window.qz.configs.create(printer);

    const businessName =
      shiftReport?.business?.name ||
      localStorage.getItem("hotelName") ||
      "Biznesi";

    const waiterName = shiftReport?.waiterName || CURRENT_WAITER_NAME;

    const printedDate = new Date(
      shiftReport?.createdAt || Date.now()
    ).toLocaleString("sq-AL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const totalNumber = Number(shiftReport?.totalALL || 0);
    const total = totalNumber.toFixed(0);

    const settings = shiftReport?.business?.settings || {};

    const eurText = convertFromALL(totalNumber, Number(settings?.eurRate) || 0, "EUR");
    const usdText = convertFromALL(totalNumber, Number(settings?.usdRate) || 0, "USD");
    const gbpText = convertFromALL(totalNumber, Number(settings?.gbpRate) || 0, "GBP");
    const chfText = convertFromALL(totalNumber, Number(settings?.chfRate) || 0, "CHF");

    const line = "--------------------------\n";

    const itemsLines = (shiftReport.items || []).map((it) => {
      const qty = Number(it?.qty) || 0;
      const itemName = String(it?.name || "Artikull").trim();
      const right = `${(qty * Number(it?.price || 0)).toFixed(0)} ALL`;
      return formatLine(`${qty}x ${itemName}`, right);
    });

    const data = [
      "\x1B\x40",
      "\x1B\x4D\x00",
      "\x1D\x21\x00",

      "\x1B\x61\x01",
      `${businessName}\n`,
      "\n*** XHIRO DITORE E KAMARIERIT ***\n\n",

      "\x1B\x61\x00",
      line,
      `Kamarier: ${waiterName}\n`,
      `Porosi: ${shiftReport?.orderCount || 0}\n`,
      `Data: ${printedDate}\n`,
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

    await window.qz.print(config, data);
  };

  const handleCloseShift = async () => {
    if (!businessId) {
      alert("Mungon businessId.");
      return;
    }

    const ok = window.confirm("Je i sigurt që dëshiron të mbyllësh xhiron?");
    if (!ok) return;

    try {
      setClosing(true);

      const res = await closeWaiterShiftApi({
        businessId,
        waiterName: CURRENT_WAITER_NAME,
      });

      const finalReport = res?.data?.report;

      if (!finalReport) {
        throw new Error("Raporti final nuk u kthye nga serveri.");
      }

      try {
        await printShiftReport(finalReport);
      } catch (printErr) {
        console.error("Printimi dështoi, por xhiro u mbyll:", printErr);
      }

      alert("Xhiro u mbyll me sukses.");
      navigate("/waiter", { replace: true });
    } catch (err) {
      console.error("Gabim mbyll xhiro:", err?.response?.data || err);
      alert(err?.response?.data?.message || err?.message || "Nuk mund të mbyll xhiron.");
    } finally {
      setClosing(false);
    }
  };

  const totalALL = Number(report?.totalALL || 0);
  const settings = report?.business?.settings || {};

  const eur = convertFromALL(totalALL, Number(settings?.eurRate) || 0, "EUR");
  const usd = convertFromALL(totalALL, Number(settings?.usdRate) || 0, "USD");
  const gbp = convertFromALL(totalALL, Number(settings?.gbpRate) || 0, "GBP");
  const chf = convertFromALL(totalALL, Number(settings?.chfRate) || 0, "CHF");

  const printedDate = report?.createdAt
    ? new Date(report.createdAt).toLocaleString("sq-AL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "-";

  return (
    <div className="waiter-xhiro-desktop-page">
      <header className="xhiro-desktop-header">
        <div>
          <h1>Xhiro e Kamarierit</h1>
          <p>Kontrollo totalet dhe mbyll turnin e sotëm</p>
        </div>

        <button
          type="button"
          className="xhiro-back-btn"
          onClick={() => navigate("/waiter")}
        >
          Kthehu
        </button>
      </header>

      {loading && (
        <div className="xhiro-loading-card">
          Duke ngarkuar xhiron...
        </div>
      )}

      {!loading && !report && (
        <div className="xhiro-empty-card">
          Nuk ka xhiro për t'u shfaqur.
        </div>
      )}

      {!loading && report && (
        <main className="xhiro-desktop-grid">
          <section className="xhiro-products-card">
            <div className="xhiro-card-head">
              <div>
                <h2>Artikujt e shitur</h2>
                <p>{report?.orderCount || 0} porosi në total</p>
              </div>
            </div>

            <div className="xhiro-products-list">
              {(report.items || []).length === 0 && (
                <div className="xhiro-empty-line">Nuk ka artikuj.</div>
              )}

              {(report.items || []).map((item, index) => {
                const qty = Number(item.qty || 0);
                const price = Number(item.price || 0);
                const total = qty * price;

                return (
                  <div className="xhiro-product-row" key={`${item.name}-${index}`}>
                    <div>
                      <strong>{qty}x {item.name}</strong>
                      <span>{price.toFixed(2)} ALL / copë</span>
                    </div>

                    <b>{total.toFixed(2)} ALL</b>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="xhiro-summary-card">
            <div className="xhiro-summary-top">
              <span>Totali për mbyllje</span>
              <strong>{totalALL.toFixed(2)} ALL</strong>
            </div>

            <div className="xhiro-info-list">
              <div>
                <span>Biznesi</span>
                <b>{report?.business?.name || localStorage.getItem("hotelName") || "Biznesi"}</b>
              </div>

              <div>
                <span>Kamarieri</span>
                <b>{report?.waiterName || CURRENT_WAITER_NAME}</b>
              </div>

              <div>
                <span>Data</span>
                <b>{printedDate}</b>
              </div>
            </div>

            <div className="xhiro-currency-box">
              <div><span>EUR</span><b>{eur}</b></div>
              <div><span>USD</span><b>{usd}</b></div>
              <div><span>GBP</span><b>{gbp}</b></div>
              <div><span>CHF</span><b>{chf}</b></div>
            </div>

            <button
              type="button"
              className="xhiro-close-btn"
              onClick={handleCloseShift}
              disabled={closing}
            >
              {closing ? "Duke mbyllur..." : "Printo & Mbyll Xhiron"}
            </button>
          </aside>
        </main>
      )}
    </div>
  );
}