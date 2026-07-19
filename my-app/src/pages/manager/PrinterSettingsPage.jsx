import { useEffect, useMemo, useState } from "react";
import qz from "../../qz-signing";
import "./PrinterSettingsPage.css";
import {
  getBusinessSettingsApi,
  updateBusinessSettingsApi,
} from "../../api/businessApi.js";
import "../../qz-signing";

export default function PrinterSettingsPage() {
  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [printers, setPrinters] = useState([]);

  const [kitchenPrinterName, setKitchenPrinterName] = useState("");
  const [barPrinterName, setBarPrinterName] = useState("");
  const [invoicePrinterName, setInvoicePrinterName] = useState("");

  const loadSettings = async () => {
    if (!businessId) {
      ("Mungon businessId.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const res = await getBusinessSettingsApi(businessId);
      const settings = res?.settings || {};

      setKitchenPrinterName(settings.kitchenPrinterName || "");
      setBarPrinterName(settings.barPrinterName || "");
      setInvoicePrinterName(settings.invoicePrinterName || "");
    } catch (err) {
      console.error("Gabim te settings:", err?.response?.data || err);
      ("Nuk munda të lexoj settings e printerave.");
    } finally {
      setLoading(false);
    }
  };

const connectQz = async () => {
  if (!qz) {
    throw new Error("QZ Tray nuk u ngarkua.");
  }

  if (qz.websocket.isActive()) {
    return true;
  }

  await qz.websocket.connect();

  return true;
};

  const handleLoadPrinters = async () => {
    try {
      setLoadingPrinters(true);

      await connectQz();

      const found = await qz.printers.find();
      console.log("PRINTERS:", found);

      const printerList = Array.isArray(found)
        ? found
        : found
        ? [found]
        : [];

      setPrinters(printerList);

      if (printerList.length === 0) {
        ("Nuk u gjet asnjë printer.");
      }
    } catch (err) {
      console.error("QZ ERROR:", err);
      (err?.message || "Unable to establish connection with QZ");
    } finally {
      setLoadingPrinters(false);
    }
  };

  const handleSave = async () => {
    if (!businessId) {
      ("Mungon businessId.");
      return;
    }

    try {
      setSaving(true);

      await updateBusinessSettingsApi(businessId, {
        kitchenPrinterName,
        barPrinterName,
        invoicePrinterName,
      });

      ("Printerat u ruajtën me sukses.");
    } catch (err) {
      console.error("Gabim te save printers:", err?.response?.data || err);
      (err?.response?.data?.message || "Nuk munda t'i ruaj printerat.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="printer-page">
        <div className="printer-card">Duke ngarkuar...</div>
      </div>
    );
  }

  return (
    <div className="printer-page">
      <div className="printer-card">
        <div className="printer-head">
          <div>
            <h1>Printerat</h1>
            <p>Zgjidh printerin për kuzhinë, bar dhe faturë.</p>
          </div>

          <button
            type="button"
            className="printer-load-btn"
            onClick={handleLoadPrinters}
            disabled={loadingPrinters}
          >
            {loadingPrinters ? "Duke lexuar..." : "Lexo printerat"}
          </button>
        </div>

        <div className="printer-grid">
          <div className="printer-field">
            <label>Printer Kuzhine</label>
            <select
              value={kitchenPrinterName}
              onChange={(e) => setKitchenPrinterName(e.target.value)}
            >
              <option value="">Zgjidh printerin</option>
              {printers.map((printer) => (
                <option key={printer} value={printer}>
                  {printer}
                </option>
              ))}
            </select>
          </div>

          <div className="printer-field">
            <label>Printer Bar</label>
            <select
              value={barPrinterName}
              onChange={(e) => setBarPrinterName(e.target.value)}
            >
              <option value="">Zgjidh printerin</option>
              {printers.map((printer) => (
                <option key={printer} value={printer}>
                  {printer}
                </option>
              ))}
            </select>
          </div>

          <div className="printer-field">
            <label>Printer Faturë</label>
            <select
              value={invoicePrinterName}
              onChange={(e) => setInvoicePrinterName(e.target.value)}
            >
              <option value="">Zgjidh printerin</option>
              {printers.map((printer) => (
                <option key={printer} value={printer}>
                  {printer}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="printer-actions">
          <button
            type="button"
            className="printer-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Duke ruajtur..." : "Ruaj"}
          </button>
        </div>
      </div>
    </div>
  );
}