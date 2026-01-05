// src/pages/manager/QrPage.jsx
import { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import "./QrPage.css";

function getPublicBaseUrl() {
  // ✅ më e mira: e vendos ti fiks në .env
  const envUrl = import.meta.env.VITE_PUBLIC_URL;
  if (envUrl && String(envUrl).trim()) return String(envUrl).trim();

  // fallback: nga browseri
  const origin = window.location.origin;

  // nëse po e hap në localhost në PC, QR s’duhet të dalë localhost
  const lanHost = import.meta.env.VITE_LAN_HOST;
  if (lanHost && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    const proto = window.location.protocol || "http:";
    // në dev Vite zakonisht është 5173
    return `${proto}//${String(lanHost).trim()}:5173`;
  }

  return origin;
}

export default function QrPage() {
  const [selectedType, setSelectedType] = useState("menu");
  const [qrValue, setQrValue] = useState("");
  const [number, setNumber] = useState("");

  const baseUrl = useMemo(() => getPublicBaseUrl(), []);

  const generateQR = () => {
    const businessId = (localStorage.getItem("businessId") || "").trim();

    if (!businessId) {
      alert("Mungon businessId në localStorage. Hyni si menaxher.");
      return;
    }

    // MENU
    if (selectedType === "menu") {
      const url = `${baseUrl}/menu?businessId=${encodeURIComponent(businessId)}`;
      setQrValue(url);
      return;
    }

    // DHOMA / CADRA – kërkohet numri
    const n = String(number || "").trim();
    if (!n) {
      alert("Vendos numrin e dhomës ose cadrës.");
      return;
    }

    if (selectedType === "dhoma") {
      const url = `${baseUrl}/order?businessId=${encodeURIComponent(
        businessId
      )}&type=room&number=${encodeURIComponent(n)}`;
      setQrValue(url);
      return;
    }

    if (selectedType === "cadra") {
      const url = `${baseUrl}/order?businessId=${encodeURIComponent(
        businessId
      )}&type=umbrella&number=${encodeURIComponent(n)}`;
      setQrValue(url);
      return;
    }
  };

  const handlePrint = () => {
    if (!qrValue) {
      alert("Së pari gjenero QR-kodin! 😊");
      return;
    }
    window.print();
  };

  return (
    <div className="qr-container">
      <h1>🔗 Gjenero QR Kode</h1>

      <p style={{ opacity: 0.75, marginTop: -8 }}>
        Base URL: <b>{baseUrl}</b>
      </p>

      <div className="qr-options">
        <button
          className={selectedType === "menu" ? "active" : ""}
          onClick={() => {
            setSelectedType("menu");
            setNumber("");
            setQrValue("");
          }}
        >
          📋 Menu
        </button>

        <button
          className={selectedType === "dhoma" ? "active" : ""}
          onClick={() => {
            setSelectedType("dhoma");
            setNumber("");
            setQrValue("");
          }}
        >
          🏨 Dhoma
        </button>

        <button
          className={selectedType === "cadra" ? "active" : ""}
          onClick={() => {
            setSelectedType("cadra");
            setNumber("");
            setQrValue("");
          }}
        >
          ⛱ Cadra
        </button>
      </div>

      {selectedType === "menu" && (
        <div className="qr-box">
          <h2>📋 QR për Menu</h2>
          <button className="generate-btn" onClick={generateQR}>
            Gjenero QR
          </button>
        </div>
      )}

      {(selectedType === "dhoma" || selectedType === "cadra") && (
        <div className="qr-box">
          <h2>
            {selectedType === "dhoma" ? "🏨 QR për Dhoma" : "⛱ QR për Cadra"}
          </h2>

          <input
            type="text"
            className="qr-input"
            placeholder={
              selectedType === "dhoma"
                ? "Shkruaj numrin e dhomës (p.sh. 101)"
                : "Shkruaj numrin e cadrës (p.sh. 23)"
            }
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />

          <button className="generate-btn" onClick={generateQR}>
            Gjenero QR
          </button>
        </div>
      )}

      {qrValue && (
        <div className="qr-result">
          <QRCode value={qrValue} size={200} />
          <p>URL: {qrValue}</p>

          <button className="print-btn" onClick={handlePrint}>
            🖨️ Printo
          </button>
        </div>
      )}
    </div>
  );
}
