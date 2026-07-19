import "../../qz-signing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { FiTrash2, FiChevronRight, FiX, FiCopy, FiExternalLink, FiDownload, FiPrinter } from "react-icons/fi";
import "./PlacesPage.css";
import { getPublicBaseUrl } from "../../utils/publicBaseUrl";
import { api } from "../../api/http.js";

const normalizeCode = (code) => String(code || "").trim().toUpperCase();
const isHHMM = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ""));

const TAB_LABEL = { table: "Tavolinë", room: "Dhomë", umbrella: "Çadër" };
const TAB_LABEL_PLURAL = { table: "Tavolina", room: "Dhoma", umbrella: "Çadra" };

export default function PlacesPage() {
  const [tab, setTab] = useState("room");
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [tablesCount, setTablesCount] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState("");

  const [showAccess, setShowAccess] = useState(false);
  const [oaLoading, setOaLoading] = useState(false);
  const [oaError, setOaError] = useState("");
  const [oaSavedMsg, setOaSavedMsg] = useState("");
  const [orderAccess, setOrderAccess] = useState({
    enabled: false,
    windowStart: "23:00",
    windowEnd: "07:00",
    applyTo: ["room", "umbrella"],
  });

  const qrRef = useRef(null);
  const baseUrl = useMemo(() => getPublicBaseUrl(), []);

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const tabLabel = TAB_LABEL[tab];
  const tabLabelPlural = TAB_LABEL_PLURAL[tab];

  const fetchPlaces = useCallback(async () => {
    if (!businessId) {
      setError("Mungon businessId. Hyni si menaxher.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.get("/places", { params: { businessId, type: tab } });
      setPlaces(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setPlaces([]);
      setError(e?.message || "Gabim. Kontrollo backend.");
    } finally {
      setLoading(false);
    }
  }, [businessId, tab]);

  const fetchOrderAccess = useCallback(async () => {
    if (!businessId) return;

    try {
      const res = await api.get("/business/order-access", { params: { businessId } });
      const data = res.data;

      setOrderAccess((prev) => ({
        ...prev,
        enabled: !!data?.enabled,
        windowStart: isHHMM(data?.windowStart) ? data.windowStart : prev.windowStart,
        windowEnd: isHHMM(data?.windowEnd) ? data.windowEnd : prev.windowEnd,
        applyTo: Array.isArray(data?.applyTo) && data.applyTo.length ? data.applyTo : prev.applyTo,
      }));
    } catch {
      // s'e ndalim faqen nëse kjo dështon
    }
  }, [businessId]);

  useEffect(() => {
    setSelectedId(null);
    if (tab !== "menu") fetchPlaces();
  }, [fetchPlaces, tab]);

  useEffect(() => {
    fetchOrderAccess();
  }, [fetchOrderAccess]);

  const selectedPlace = useMemo(
    () => places.find((p) => p._id === selectedId) || null,
    [places, selectedId]
  );

  useEffect(() => {
    if (!selectedId && places.length > 0) {
      setSelectedId(places[0]._id);
    }
  }, [places, selectedId]);

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return places;
    return places.filter((p) =>
      String(p.codeNormalized || p.code || "").toLowerCase().includes(q)
    );
  }, [places, search]);

  const handleGenerateTables = async () => {
    if (!businessId) return;
    const total = Number(tablesCount);

    if (!Number.isInteger(total) || total <= 0) {
      setError("Vendos një numër të saktë");
      return;
    }

    setGenLoading(true);
    setError("");

    try {
      await api.post("/places/generate", { businessId, type: "table", total });
      setTablesCount("");
      setShowAdd(false);
      await fetchPlaces();
    } catch (e) {
      setError(e?.message || "Gabim");
    } finally {
      setGenLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!businessId) {
      setError("Mungon businessId.");
      return;
    }

    const codeNorm = normalizeCode(codeInput);
    if (!codeNorm) return;

    if (!/^[A-Z0-9-]+$/.test(codeNorm)) {
      setError("Kodi lejohet vetëm me A-Z, 0-9 dhe '-'.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/places", { businessId, type: tab, code: codeNorm });
      setCodeInput("");
      setShowAdd(false);
      await fetchPlaces();
    } catch (e) {
      setError(e?.message || "Gabim.");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (placeId, nextActive) => {
    try {
      await api.patch(`/places/${placeId}/active`, { isActive: nextActive });
      setPlaces((prev) =>
        prev.map((p) => (p._id === placeId ? { ...p, isActive: nextActive } : p))
      );
    } catch (e) {
      setError(e?.message || "Gabim rrjeti.");
    }
  };

  const removePlace = async (placeId) => {
    const ok = window.confirm(`Fshi këtë ${tabLabel.toLowerCase()}?`);
    if (!ok) return;

    try {
      await api.delete(`/places/${placeId}`, { params: { businessId } });
      setSelectedId(null);
      await fetchPlaces();
    } catch (e) {
      setError(e?.message || "Gabim gjatë fshirjes.");
    }
  };

  const orderUrl = (place) =>
    place?.qrToken ? `${baseUrl}/order/${encodeURIComponent(place.qrToken)}` : "";

  const menuUrl = businessId ? `${baseUrl}/menu?businessId=${encodeURIComponent(businessId)}` : "";

  const copyLink = async (url) => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const openLink = (url) => {
    if (url) window.open(url, "_blank");
  };

  const downloadPng = (fileLabel) => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const size = 1000;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 80, 80, size - 160, size - 160);

      URL.revokeObjectURL(svgUrl);

      const link = document.createElement("a");
      link.download = `qr-${fileLabel}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = svgUrl;
  };

  const printQr = () => window.print();

  const saveOrderAccess = async () => {
    if (!businessId) return;

    if (!isHHMM(orderAccess.windowStart) || !isHHMM(orderAccess.windowEnd)) {
      setOaError("Orari duhet të jetë në formatin HH:mm.");
      return;
    }

    setOaLoading(true);
    setOaError("");
    setOaSavedMsg("");

    try {
      await api.patch("/business/order-access", {
        businessId,
        enabled: orderAccess.enabled,
        windowStart: orderAccess.windowStart,
        windowEnd: orderAccess.windowEnd,
        applyTo: orderAccess.applyTo,
      });
      setOaSavedMsg("U ruajt me sukses.");
    } catch (e) {
      setOaError(e?.message || "Gabim.");
    } finally {
      setOaLoading(false);
    }
  };

  return (
    <div className="prod-page">
      <div className="prod-top">
        <h1 className="prod-title">Vendet & QR</h1>
      </div>

      <div className="prod-tabs">
        <button type="button" className={tab === "menu" ? "active" : ""} onClick={() => setTab("menu")}>
          Menu
        </button>
        <button type="button" className={tab === "table" ? "active" : ""} onClick={() => setTab("table")}>
          Tavolina
        </button>
        <button type="button" className={tab === "room" ? "active" : ""} onClick={() => setTab("room")}>
          Dhoma
        </button>
        <button type="button" className={tab === "umbrella" ? "active" : ""} onClick={() => setTab("umbrella")}>
          Çadra
        </button>
      </div>

      {tab !== "menu" && (
        <div className="prod-chips-row">
          <div className="prod-chips">
            <button type="button" className="chip chip-add" onClick={() => setShowAccess(true)}>
              Aksesi i porosive
            </button>
          </div>
        </div>
      )}

      <div className="prod-split">
        {tab === "menu" ? (
          <div className="prod-detail-panel menu-qr-panel">
            <div className="place-detail-grid menu-only">
              <div className="place-detail-left">
                <div className="prod-detail-head">
                  <h2>Menu online</h2>
                </div>

                <div className="place-tip-box">
                  Ky QR i dërgon klientët direkt te menuja online e biznesit tuaj.
                </div>

                <div className="field">
                  <label>Linku i menusë</label>
                  <div className="place-link-row">
                    <input value={menuUrl} readOnly />
                    <button type="button" onClick={() => copyLink(menuUrl)} title="Kopjo">
                      <FiCopy />
                    </button>
                    <button type="button" onClick={() => openLink(menuUrl)} title="Hap">
                      <FiExternalLink />
                    </button>
                  </div>
                </div>
              </div>

              <div className="place-detail-right">
                <span className="place-qr-kicker">QR Code</span>

                <div className="place-qr-box" ref={qrRef}>
                  <QRCode value={menuUrl || " "} size={180} />
                </div>

                <div className="place-qr-label">MENU</div>
                <div className="place-qr-hint">Skanoni për të parë menunë</div>

                <div className="place-qr-actions">
                  <button className="btn ghost" onClick={() => downloadPng("menu")} type="button">
                    <FiDownload /> Shkarko PNG
                  </button>
                  <button className="btn ghost" onClick={printQr} type="button">
                    <FiPrinter /> Printo
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
        <div className="prod-list-panel">
          <div className="prod-list-head">
            <h2>Lista e {tabLabelPlural.toLowerCase()}ve</h2>
            <p>Totali: {filteredPlaces.length} {tabLabelPlural.toLowerCase()}</p>
          </div>

          <div className="prod-list-toolbar">
            <input
              className="prod-search"
              placeholder={`Kërko ${tabLabel.toLowerCase()}n...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button className="prod-add-btn" onClick={() => setShowAdd(true)}>
              + Shto {tabLabel}
            </button>
          </div>

          <div className="prod-list">
            {loading ? (
              <div className="prod-empty">Duke ngarkuar...</div>
            ) : filteredPlaces.length === 0 ? (
              <div className="prod-empty">Nuk ka {tabLabelPlural.toLowerCase()} të regjistruara.</div>
            ) : (
              filteredPlaces.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  className={`prod-list-item ${selectedId === p._id ? "active" : ""}`}
                  onClick={() => setSelectedId(p._id)}
                >
                  <div className="prod-list-item-text">
                    <span className="name">{p.codeNormalized || p.code}</span>
                    <span className={`place-status ${p.isActive !== false ? "on" : "off"}`}>
                      {p.isActive !== false ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <FiChevronRight className="chev" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="prod-detail-panel">
          {!selectedPlace ? (
            <div className="prod-detail-empty">
              Zgjidh {tabLabel.toLowerCase()}n nga lista, ose shto një të re.
            </div>
          ) : (
            <div className="place-detail-grid">
              <div className="place-detail-left">
                <div className="prod-detail-head">
                  <h2>Detajet e {tabLabel.toLowerCase()}s</h2>
                  <div className="prod-detail-head-actions">
                    <button className="prod-delete-btn" onClick={() => removePlace(selectedPlace._id)} type="button">
                      <FiTrash2 /> Fshi {tabLabel.toLowerCase()}n
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>Kodi</label>
                  <input value={selectedPlace.codeNormalized || selectedPlace.code || ""} readOnly />
                </div>

                <div className="field">
                  <label>Statusi</label>
                  <div className="dest-toggle place-status-toggle">
                    <button
                      type="button"
                      className={selectedPlace.isActive !== false ? "active" : ""}
                      onClick={() => toggleActive(selectedPlace._id, true)}
                    >
                      Aktive
                    </button>
                    <button
                      type="button"
                      className={selectedPlace.isActive === false ? "active" : ""}
                      onClick={() => toggleActive(selectedPlace._id, false)}
                    >
                      Disabled
                    </button>
                  </div>
                </div>

                <div className="place-tip-box">
                  Ky QR i dërgon klientët direkt te faqja e porosisë online.
                </div>

                <div className="field">
                  <label>Linku i porosisë</label>
                  <div className="place-link-row">
                    <input value={orderUrl(selectedPlace)} readOnly />
                    <button type="button" onClick={() => copyLink(orderUrl(selectedPlace))} title="Kopjo">
                      <FiCopy />
                    </button>
                    <button type="button" onClick={() => openLink(orderUrl(selectedPlace))} title="Hap">
                      <FiExternalLink />
                    </button>
                  </div>
                </div>
              </div>

              <div className="place-detail-right">
                <span className="place-qr-kicker">QR Code</span>

                <div className="place-qr-box" ref={qrRef}>
                  <QRCode value={orderUrl(selectedPlace) || " "} size={180} />
                </div>

                <div className="place-qr-label">
                  {selectedPlace.codeNormalized || selectedPlace.code}
                </div>
                <div className="place-qr-hint">Skanoni për porosinë tuaj</div>

                <div className="place-qr-actions">
                  <button
                    className="btn ghost"
                    onClick={() => downloadPng(`${tab}-${selectedPlace.codeNormalized || selectedPlace.code}`)}
                    type="button"
                  >
                    <FiDownload /> Shkarko PNG
                  </button>
                  <button className="btn ghost" onClick={printQr} type="button">
                    <FiPrinter /> Printo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {error && <div className="place-error-toast">{error}</div>}

      {/* ============ ADD MODAL ============ */}
      {showAdd && (
        <div className="cat-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="cat-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="cat-modal-head">
              <h2>Shto {tabLabel}</h2>
              <button className="prod-close-btn" onClick={() => setShowAdd(false)}>
                <FiX />
              </button>
            </div>

            {tab === "table" ? (
              <div className="field">
                <label>Sa tavolina?</label>
                <input
                  type="number"
                  placeholder="p.sh. 20"
                  value={tablesCount}
                  onChange={(e) => setTablesCount(e.target.value)}
                />
              </div>
            ) : (
              <div className="field">
                <label>Kodi</label>
                <input
                  placeholder="A130 / B250"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                />
              </div>
            )}

            {error && <div className="place-error-inline">{error}</div>}

            <div className="prod-detail-actions">
              <button className="btn ghost" onClick={() => setShowAdd(false)} type="button">
                Anulo
              </button>
              <button
                className="btn primary"
                onClick={tab === "table" ? handleGenerateTables : handleAdd}
                disabled={genLoading || loading}
                type="button"
              >
                {tab === "table" ? "Gjenero" : "Shto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ ORDER ACCESS MODAL ============ */}
      {showAccess && (
        <div className="cat-modal-overlay" onClick={() => setShowAccess(false)}>
          <div className="cat-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="cat-modal-head">
              <h2>Aksesi i porosive</h2>
              <button className="prod-close-btn" onClick={() => setShowAccess(false)}>
                <FiX />
              </button>
            </div>

            <div className="field">
              <label>Statusi</label>
              <div className="dest-toggle">
                <button
                  type="button"
                  className={orderAccess.enabled ? "active" : ""}
                  onClick={() => setOrderAccess((p) => ({ ...p, enabled: true }))}
                >
                  Aktiv
                </button>
                <button
                  type="button"
                  className={!orderAccess.enabled ? "active" : ""}
                  onClick={() => setOrderAccess((p) => ({ ...p, enabled: false }))}
                >
                  I çaktivizuar
                </button>
              </div>
            </div>

            <div className="field">
              <label>Nga ora</label>
              <input
                type="time"
                step="60"
                value={orderAccess.windowStart || "23:00"}
                onChange={(e) => setOrderAccess((p) => ({ ...p, windowStart: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Deri në orën</label>
              <input
                type="time"
                step="60"
                value={orderAccess.windowEnd || "07:00"}
                onChange={(e) => setOrderAccess((p) => ({ ...p, windowEnd: e.target.value }))}
              />
            </div>

            {oaError && <div className="place-error-inline">{oaError}</div>}
            {oaSavedMsg && <div className="place-ok-inline">{oaSavedMsg}</div>}

            <div className="prod-detail-actions">
              <button className="btn ghost" onClick={() => setShowAccess(false)} type="button">
                Mbyll
              </button>
              <button className="btn primary" onClick={saveOrderAccess} disabled={oaLoading} type="button">
                {oaLoading ? "Duke ruajtur..." : "Ruaj"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}