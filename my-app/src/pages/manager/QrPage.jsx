import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import "./QrPage.css";

function getPublicBaseUrl() {
  const envUrl = import.meta.env.VITE_PUBLIC_URL;
  if (envUrl && String(envUrl).trim()) return String(envUrl).trim();

  const lanHost = import.meta.env.VITE_LAN_HOST;
  if (lanHost && String(lanHost).trim()) {
    const proto = window.location.protocol || "http:";
    return `${proto}//${String(lanHost).trim()}:5173`;
  }

  return window.location.origin;
}

const sortByCode = (a, b) => {
  const A = String(a.codeNormalized || a.code || "").toUpperCase();
  const B = String(b.codeNormalized || b.code || "").toUpperCase();
  return A.localeCompare(B);
};

export default function QrPage() {
  const [selectedType, setSelectedType] = useState("menu");
  const [places, setPlaces] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [qrItems, setQrItems] = useState([]);
  const [customBg, setCustomBg] = useState(null);

  const [cardSettings, setCardSettings] = useState({
    width: 320,
    height: 500,
    radius: 22,
    padding: 24,
    blur: 2,
    qrSize: 180,
  });

  const previewQrRef = useRef(null);

  const baseUrl = useMemo(() => getPublicBaseUrl(), []);
  const apiBase = "";

  const activePlaces = useMemo(() => {
    return places
      .filter((p) => p && p.isActive !== false && p.qrToken)
      .sort(sortByCode);
  }, [places]);

  useEffect(() => {
    const businessId = (localStorage.getItem("businessId") || "").trim();
    if (!businessId) return;

    setQrItems([]);
    setSelectedPlaceId("");

    if (selectedType === "dhoma" || selectedType === "cadra") {
      const type = selectedType === "dhoma" ? "room" : "umbrella";

      fetch(
        `${apiBase}/api/places?businessId=${encodeURIComponent(
          businessId
        )}&type=${type}`
      )
        .then((r) => r.json())
        .then((data) => {
          const arr = Array.isArray(data) ? data : [];
          setPlaces(arr);
        })
        .catch(() => setPlaces([]));
    } else {
      setPlaces([]);
    }
  }, [selectedType]);

  const handleBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setCustomBg(imageUrl);
  };

  const handleCardSettingChange = (key, value) => {
    setCardSettings((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  const generateQR = () => {
    const businessId = (localStorage.getItem("businessId") || "").trim();
    if (!businessId) {
      alert("Mungon businessId në localStorage. Hyni si menaxher.");
      return;
    }

    if (selectedType === "menu") {
      const url = `${baseUrl}/menu?businessId=${encodeURIComponent(businessId)}`;
      setQrItems([{ label: "Menu", url }]);
      return;
    }

    if (!activePlaces.length) {
      alert("Nuk ka kode aktive për këtë kategori.");
      return;
    }

    if (!selectedPlaceId) {
      alert("Zgjidh një kod ose Të gjitha.");
      return;
    }

    if (selectedPlaceId === "__ALL__") {
      const items = activePlaces.map((p) => ({
        label: p.codeNormalized || p.code || "Place",
        url: `${baseUrl}/order/${encodeURIComponent(p.qrToken)}`,
      }));
      setQrItems(items);
      return;
    }

    const place = activePlaces.find((p) => p._id === selectedPlaceId);
    if (!place) {
      alert("Zgjedhje e pavlefshme.");
      return;
    }

    setQrItems([
      {
        label: place.codeNormalized || place.code || "Place",
        url: `${baseUrl}/order/${encodeURIComponent(place.qrToken)}`,
      },
    ]);
  };

  const handlePrint = () => {
    if (!qrItems.length) {
      alert("Së pari gjenero QR-kodin.");
      return;
    }
    window.print();
  };

  const previewItem = qrItems[0] || null;

  const handleDownloadPng = () => {
    if (!previewItem || !previewQrRef.current) {
      alert("Së pari gjenero QR-kodin.");
      return;
    }

    const svg = previewQrRef.current.querySelector("svg");
    if (!svg) {
      alert("QR nuk u gjet për shkarkim.");
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const size = 1200;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      ctx.drawImage(img, 100, 100, size - 200, size - 200);

      URL.revokeObjectURL(svgUrl);

      const link = document.createElement("a");
      const fileLabel =
        selectedType === "menu"
          ? "menu"
          : (previewItem.label || "qr").toLowerCase().replace(/\s+/g, "-");

      link.download = `qr-${selectedType}-${fileLabel}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = svgUrl;
  };

  const sectionTitle =
    selectedType === "menu"
      ? "QR për Menu"
      : selectedType === "dhoma"
      ? "QR për Dhoma"
      : "QR për Cadra";

  const sectionText =
    selectedType === "menu"
      ? "Gjenero një QR të vetëm për menu-n online."
      : selectedType === "dhoma"
      ? "Zgjidh një dhomë ose gjenero QR për të gjitha dhomat aktive."
      : "Zgjidh një çadër ose gjenero QR për të gjitha çadrat aktive.";

  const outputText =
    selectedType === "menu"
      ? "1 QR kod"
      : selectedType === "dhoma" || selectedType === "cadra"
      ? selectedPlaceId === "__ALL__"
        ? "Shumë QR"
        : "1 QR kod"
      : "1 QR kod";

  const getPreviewTitle = (item) => {
    if (!item) return "";
    if (selectedType === "menu") return "MENU";
    return `${selectedType === "dhoma" ? "Dhoma" : "Cadra"}: ${item.label}`;
  };

  return (
    <div className="qr-page">
      <div className="qr-shell">
        <div className="qr-hero">
          <h1 className="qr-title">Gjenero QR Code</h1>
          <p className="qr-subtitle">
            Personalizo madhësinë dhe stilin e kartës QR sipas nevojës.
          </p>
        </div>

        <div className="qr-tabs">
          <button
            type="button"
            className={`qr-tab ${selectedType === "menu" ? "active" : ""}`}
            onClick={() => setSelectedType("menu")}
          >
            Menu
          </button>

          <button
            type="button"
            className={`qr-tab ${selectedType === "dhoma" ? "active" : ""}`}
            onClick={() => setSelectedType("dhoma")}
          >
            Dhoma
          </button>

          <button
            type="button"
            className={`qr-tab ${selectedType === "cadra" ? "active" : ""}`}
            onClick={() => setSelectedType("cadra")}
          >
            Cadra
          </button>
        </div>

        <div className="qr-main-card">
          <div className="qr-left">
            <div className="qr-section-head">
              <h2>{sectionTitle}</h2>
              <p>{sectionText}</p>
            </div>

            <div className="qr-meta">
              <div className="qr-meta-item">
                <span className="qr-meta-label">Tipi</span>
                <strong>
                  {selectedType === "menu"
                    ? "Menu"
                    : selectedType === "dhoma"
                    ? "Dhoma"
                    : "Cadra"}
                </strong>
              </div>

              <div className="qr-meta-item">
                <span className="qr-meta-label">Statusi</span>
                <strong>{previewItem ? "I gjeneruar" : "Gati për gjenerim"}</strong>
              </div>

              <div className="qr-meta-item">
                <span className="qr-meta-label">Output</span>
                <strong>{outputText}</strong>
              </div>
            </div>

            {(selectedType === "dhoma" || selectedType === "cadra") && (
              <div className="qr-form-block">
                <label className="qr-label">Zgjidh kodin</label>
                <select
                  className="qr-select"
                  value={selectedPlaceId}
                  onChange={(e) => setSelectedPlaceId(e.target.value)}
                >
                  <option value="">Zgjidh...</option>
                  {activePlaces.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.codeNormalized || p.code}
                    </option>
                  ))}
                  <option value="__ALL__">Të gjitha</option>
                </select>
              </div>
            )}

            <div className="qr-tip-box">
              {selectedType === "menu"
                ? "Ky QR i dërgon klientët direkt te menuja online."
                : selectedType === "dhoma"
                ? "Ky QR përdoret për porositë që vijnë nga dhomat."
                : "Ky QR përdoret për porositë që vijnë nga çadrat."}
            </div>

            <div className="qr-actions">
              <button className="qr-primary-btn" onClick={generateQR}>
                Gjenero QR
              </button>

              <label className="qr-secondary-btn qr-upload-btn">
                Ngarko Background
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBgUpload}
                  hidden
                />
              </label>

              {!!qrItems.length && (
                <>
                  <button className="qr-secondary-btn" onClick={handlePrint}>
                    Printo
                  </button>

                  <button className="qr-secondary-btn" onClick={handleDownloadPng}>
                    Shkarko PNG
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="qr-right">
            <div
              className="qr-preview-card qr-live-card"
              style={{
                "--card-width": `${cardSettings.width}px`,
                "--card-height": `${cardSettings.height}px`,
                "--card-radius": `${cardSettings.radius}px`,
                "--card-padding": `${cardSettings.padding}px`,
                "--card-blur": `${cardSettings.blur}px`,
                backgroundImage: customBg ? `url(${customBg})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {previewItem ? (
                <>
                  <div className="qr-preview-top">Preview</div>

                  <div className="qr-preview-code" ref={previewQrRef}>
                    <QRCode value={previewItem.url} size={cardSettings.qrSize} />
                  </div>

                  <div className="qr-preview-label">{getPreviewTitle(previewItem)}</div>

                  <div className="qr-preview-hint">Skanoni për porosinë tuaj</div>

                  <div className="qr-preview-meta">
                    <span>Live preview</span>
                    <span>Kartë e personalizuar</span>
                    <span>Gati për klientët</span>
                  </div>
                </>
              ) : (
                <div className="qr-empty-state">
                  <div className="qr-empty-box" />
                  <h3>Preview i QR</h3>
                  <p>QR kodi do të shfaqet këtu pasi ta gjenerosh.</p>

                  <div className="qr-preview-meta">
                    <span>Live preview</span>
                    <span>Kartë e personalizuar</span>
                    <span>Gati për klientët</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {!!qrItems.length && (
          <div className="qr-results print-area">
            <div
              className="print-bg"
              style={{
                backgroundImage: customBg ? `url(${customBg})` : "none",
              }}
            />

            <div className="qr-results-head no-print">
              <h3>Të gjitha QR-të e gjeneruara</h3>
            </div>

            <div className="qr-results-flex">
              <div className="qr-preview-side">
                {qrItems.map((it) => (
                  <div
                    className="qr-item qr-card-print qr-text-dark"
                    key={it.url}
                    style={{
                      "--card-width": `${cardSettings.width}px`,
                      "--card-height": `${cardSettings.height}px`,
                      "--card-radius": `${cardSettings.radius}px`,
                      "--card-padding": `${cardSettings.padding}px`,
                      "--card-blur": `${cardSettings.blur}px`,
                    }}
                  >
                    <div
                      className="qr-card-bg"
                      style={{
                        backgroundImage: customBg ? `url(${customBg})` : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />

                    <div className="qr-card-overlay" />

                    <div className="qr-card-content">
                      <div className="qr-item-code">
                        <QRCode value={it.url} size={cardSettings.qrSize} />
                      </div>

                      <div className="qr-item-room">{getPreviewTitle(it)}</div>

                      <div className="qr-item-hint">
                        Skanoni për porosinë tuaj
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="qr-settings-side no-print">
                <div className="qr-results-settings">
                  <h3 className="qr-builder-title">Rregullo kartën</h3>

                  <div className="qr-builder-grid">
                    <div className="qr-control">
                      <label>Gjerësia: {cardSettings.width}px</label>
                      <input
                        type="range"
                        min="240"
                        max="500"
                        value={cardSettings.width}
                        onChange={(e) =>
                          handleCardSettingChange("width", e.target.value)
                        }
                      />
                    </div>

                    <div className="qr-control">
                      <label>Lartësia: {cardSettings.height}px</label>
                      <input
                        type="range"
                        min="340"
                        max="700"
                        value={cardSettings.height}
                        onChange={(e) =>
                          handleCardSettingChange("height", e.target.value)
                        }
                      />
                    </div>

                    <div className="qr-control">
                      <label>Radius: {cardSettings.radius}px</label>
                      <input
                        type="range"
                        min="8"
                        max="40"
                        value={cardSettings.radius}
                        onChange={(e) =>
                          handleCardSettingChange("radius", e.target.value)
                        }
                      />
                    </div>

                    <div className="qr-control">
                      <label>Padding: {cardSettings.padding}px</label>
                      <input
                        type="range"
                        min="10"
                        max="40"
                        value={cardSettings.padding}
                        onChange={(e) =>
                          handleCardSettingChange("padding", e.target.value)
                        }
                      />
                    </div>

                    <div className="qr-control">
                      <label>Blur: {cardSettings.blur}px</label>
                      <input
                        type="range"
                        min="0"
                        max="8"
                        value={cardSettings.blur}
                        onChange={(e) =>
                          handleCardSettingChange("blur", e.target.value)
                        }
                      />
                    </div>

                    <div className="qr-control">
                      <label>Madhësia e QR: {cardSettings.qrSize}px</label>
                      <input
                        type="range"
                        min="120"
                        max="240"
                        value={cardSettings.qrSize}
                        onChange={(e) =>
                          handleCardSettingChange("qrSize", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}