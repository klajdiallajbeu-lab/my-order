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

  // gjenerim me shumicë
  const [genMode, setGenMode] = useState("bulk"); // "bulk" | "single"  (vetëm për room/umbrella)
  const [tablesCount, setTablesCount] = useState("");
  const [prefix, setPrefix] = useState("");
  const [startNum, setStartNum] = useState("1");

  // shtim një nga një
  const [codeInput, setCodeInput] = useState("");

  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState("");

  // zgjedhje me shumicë (fshirje / printim)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [printSet, setPrintSet] = useState([]); // vendet për printim

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
    setSelectMode(false);
    setSelectedIds(new Set());
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

  // Hap modalin dhe rivendos fushat sipas tabit
  const openAddModal = () => {
    setError("");
    setTablesCount("");
    setPrefix("");
    setStartNum("1");
    setCodeInput("");
    // tavolinat gjithmonë bulk; dhoma/çadra default bulk (kjo është ajo që doje)
    setGenMode("bulk");
    setShowAdd(true);
  };

  // Pamje paraprake e kodeve që do të krijohen (p.sh. A1 → A30)
  const genPreview = useMemo(() => {
    const total = Number(tablesCount);
    if (!Number.isInteger(total) || total <= 0) return "";

    const start = tab === "table" ? 1 : Number(startNum || 1);
    if (!Number.isInteger(start) || start < 0) return "";

    const p = tab === "table" ? "" : normalizeCode(prefix);
    const first = `${p}${start}`;
    const last = `${p}${start + total - 1}`;
    return total === 1 ? first : `${first} → ${last}`;
  }, [tablesCount, startNum, prefix, tab]);

  // GJENERIM ME SHUMICË (tavolina, dhoma, çadra)
  const handleGenerate = async () => {
    if (!businessId) {
      setError("Mungon businessId.");
      return;
    }

    const total = Number(tablesCount);
    if (!Number.isInteger(total) || total <= 0) {
      setError("Vendos një numër të saktë");
      return;
    }
    if (total > 500) {
      setError("Maksimumi 500 njëherësh.");
      return;
    }

    const start = tab === "table" ? 1 : Number(startNum || 1);
    if (!Number.isInteger(start) || start < 0) {
      setError("Numri fillestar s'është i saktë.");
      return;
    }

    const cleanPrefix = tab === "table" ? "" : normalizeCode(prefix);
    if (cleanPrefix && !/^[A-Z0-9-]+$/.test(cleanPrefix)) {
      setError("Prefiksi lejohet vetëm me A-Z, 0-9 dhe '-'.");
      return;
    }

    setGenLoading(true);
    setError("");

    try {
      await api.post("/places/generate", {
        businessId,
        type: tab,
        total,
        prefix: cleanPrefix,
        start,
      });
      setTablesCount("");
      setPrefix("");
      setStartNum("1");
      setShowAdd(false);
      await fetchPlaces();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim");
    } finally {
      setGenLoading(false);
    }
  };

  // SHTIM NJË NGA NJË (dhoma, çadra)
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
      setError(e?.response?.data?.message || e?.message || "Gabim.");
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

  /* ---------- Zgjedhje me shumicë ---------- */

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected =
    filteredPlaces.length > 0 && selectedIds.size === filteredPlaces.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPlaces.map((p) => p._id)));
    }
  };

  const bulkDeleteSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const ok = window.confirm(
      `Fshi ${ids.length} ${tabLabelPlural.toLowerCase()} të zgjedhura?`
    );
    if (!ok) return;

    setBulkBusy(true);
    setError("");
    try {
      await api.post("/places/bulk-delete", { businessId, type: tab, ids });
      setSelectedId(null);
      exitSelectMode();
      await fetchPlaces();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim gjatë fshirjes.");
    } finally {
      setBulkBusy(false);
    }
  };

  const deleteAll = async () => {
    const ok = window.confirm(
      `KUJDES: do të fshihen TË GJITHA ${tabLabelPlural.toLowerCase()} (${filteredPlaces.length}). Vazhdo?`
    );
    if (!ok) return;

    setBulkBusy(true);
    setError("");
    try {
      await api.post("/places/bulk-delete", { businessId, type: tab, all: true });
      setSelectedId(null);
      exitSelectMode();
      await fetchPlaces();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim gjatë fshirjes.");
    } finally {
      setBulkBusy(false);
    }
  };

  /* ---------- Printim / Shkarkim i të zgjedhurave ---------- */

  const printSelected = () => {
    const chosen = filteredPlaces.filter((p) => selectedIds.has(p._id));
    if (chosen.length === 0) return;
    setPrintSet(chosen);
    // prit që QR-të të renderohen para se të hapet dialogu i printimit
    setTimeout(() => window.print(), 300);
  };

  const printAll = () => {
    if (filteredPlaces.length === 0) return;
    setPrintSet(filteredPlaces);
    setTimeout(() => window.print(), 300);
  };

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

  // A jemi në modalitet gjenerimi për butonin/labelin?
  const isGenerating = tab === "table" || genMode === "bulk";

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

            {!selectMode ? (
              <button className="prod-add-btn" onClick={openAddModal}>
                + Shto {tabLabel}
              </button>
            ) : null}
          </div>

          {/* Shiriti i veprimeve me shumicë */}
          <div className="places-bulkbar">
            {!selectMode ? (
              <>
                <button
                  type="button"
                  className="places-bulk-btn"
                  onClick={() => setSelectMode(true)}
                  disabled={filteredPlaces.length === 0}
                >
                  Zgjidh
                </button>
                <button
                  type="button"
                  className="places-bulk-btn"
                  onClick={printAll}
                  disabled={filteredPlaces.length === 0}
                >
                  Printo të gjitha
                </button>
                <button
                  type="button"
                  className="places-bulk-btn danger"
                  onClick={deleteAll}
                  disabled={filteredPlaces.length === 0 || bulkBusy}
                >
                  Fshi të gjitha
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="places-bulk-btn"
                  onClick={toggleSelectAll}
                >
                  {allSelected ? "Hiq zgjedhjen" : "Zgjidh të gjitha"}
                </button>
                <span className="places-bulk-count">
                  {selectedIds.size} të zgjedhura
                </span>
                <button
                  type="button"
                  className="places-bulk-btn"
                  onClick={printSelected}
                  disabled={selectedIds.size === 0}
                >
                  Printo / Shkarko
                </button>
                <button
                  type="button"
                  className="places-bulk-btn danger"
                  onClick={bulkDeleteSelected}
                  disabled={selectedIds.size === 0 || bulkBusy}
                >
                  Fshi të zgjedhurat
                </button>
                <button
                  type="button"
                  className="places-bulk-btn ghost"
                  onClick={exitSelectMode}
                >
                  Anulo
                </button>
              </>
            )}
          </div>

          <div className="prod-list">
            {loading ? (
              <div className="prod-empty">Duke ngarkuar...</div>
            ) : filteredPlaces.length === 0 ? (
              <div className="prod-empty">Nuk ka {tabLabelPlural.toLowerCase()} të regjistruara.</div>
            ) : (
              filteredPlaces.map((p) => {
                const checked = selectedIds.has(p._id);
                return (
                  <button
                    key={p._id}
                    type="button"
                    className={`prod-list-item ${
                      selectMode
                        ? checked
                          ? "selected"
                          : ""
                        : selectedId === p._id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      selectMode ? toggleSelect(p._id) : setSelectedId(p._id)
                    }
                  >
                    {selectMode && (
                      <span
                        className={`places-check ${checked ? "on" : ""}`}
                        aria-hidden="true"
                      >
                        {checked ? "✓" : ""}
                      </span>
                    )}

                    <div className="prod-list-item-text">
                      <span className="name">{p.codeNormalized || p.code}</span>
                      <span className={`place-status ${p.isActive !== false ? "on" : "off"}`}>
                        {p.isActive !== false ? "Active" : "Disabled"}
                      </span>
                    </div>

                    {!selectMode && <FiChevronRight className="chev" />}
                  </button>
                );
              })
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
              <h2>Shto {tabLabelPlural}</h2>
              <button className="prod-close-btn" onClick={() => setShowAdd(false)}>
                <FiX />
              </button>
            </div>

            {tab === "table" ? (
              /* ---- TAVOLINA: vetëm numër ---- */
              <>
                <div className="field">
                  <label>Sa tavolina?</label>
                  <input
                    type="number"
                    placeholder="p.sh. 20"
                    value={tablesCount}
                    onChange={(e) => setTablesCount(e.target.value)}
                  />
                </div>
                {genPreview && (
                  <div className="place-tip-box">
                    Do të krijohen: <strong>{genPreview}</strong>
                  </div>
                )}
              </>
            ) : (
              /* ---- DHOMA / ÇADRA: bulk ose një nga një ---- */
              <>
                <div className="field">
                  <label>Mënyra</label>
                  <div className="dest-toggle">
                    <button
                      type="button"
                      className={genMode === "bulk" ? "active" : ""}
                      onClick={() => setGenMode("bulk")}
                    >
                      Gjenero shumë
                    </button>
                    <button
                      type="button"
                      className={genMode === "single" ? "active" : ""}
                      onClick={() => setGenMode("single")}
                    >
                      Një nga një
                    </button>
                  </div>
                </div>

                {genMode === "bulk" ? (
                  <>
                    <div className="field">
                      <label>Prefiksi (opsional)</label>
                      <input
                        placeholder="p.sh. A"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                      />
                    </div>

                    <div className="field">
                      <label>Fillo nga numri</label>
                      <input
                        type="number"
                        placeholder="1"
                        value={startNum}
                        onChange={(e) => setStartNum(e.target.value)}
                      />
                    </div>

                    <div className="field">
                      <label>Sa {tabLabelPlural.toLowerCase()}?</label>
                      <input
                        type="number"
                        placeholder="p.sh. 30"
                        value={tablesCount}
                        onChange={(e) => setTablesCount(e.target.value)}
                      />
                    </div>

                    {genPreview && (
                      <div className="place-tip-box">
                        Do të krijohen: <strong>{genPreview}</strong>
                      </div>
                    )}
                  </>
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
              </>
            )}

            {error && <div className="place-error-inline">{error}</div>}

            <div className="prod-detail-actions">
              <button className="btn ghost" onClick={() => setShowAdd(false)} type="button">
                Anulo
              </button>
              <button
                className="btn primary"
                onClick={isGenerating ? handleGenerate : handleAdd}
                disabled={genLoading || loading}
                type="button"
              >
                {isGenerating ? "Gjenero" : "Shto"}
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

      {/* ===== ZONA E PRINTIMIT (fshihet në ekran, shfaqet vetëm në print) ===== */}
      <div className="places-print-area">
        {printSet.map((p) => (
          <div className="places-print-card" key={`print-${p._id}`}>
            <QRCode value={orderUrl(p) || " "} size={150} />
            <div className="places-print-code">{p.codeNormalized || p.code}</div>
          </div>
        ))}
      </div>

      <style>{`
        .places-bulkbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin: 8px 0 12px;
        }
        .places-bulk-btn {
          padding: 7px 12px;
          border-radius: 8px;
          border: 1px solid #d0d5dd;
          background: #fff;
          color: #344054;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        .places-bulk-btn:disabled { opacity: .5; cursor: not-allowed; }
        .places-bulk-btn.danger { border-color: #fda29b; color: #b42318; }
        .places-bulk-btn.ghost { color: #667085; }
        .places-bulk-count { font-size: 13px; color: #667085; font-weight: 600; }
        .places-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          min-width: 20px;
          border-radius: 6px;
          border: 1.5px solid #d0d5dd;
          margin-right: 10px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
        }
        .places-check.on { background: #1570ef; border-color: #1570ef; }
        .prod-list-item.selected { background: #eff6ff; }

        .places-print-area { display: none; }

        @media print {
          body * { visibility: hidden !important; }
          .places-print-area, .places-print-area * { visibility: visible !important; }
          .places-print-area {
            display: flex !important;
            flex-wrap: wrap;
            gap: 18px;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 16px;
          }
          .places-print-card {
            width: 180px;
            border: 1px solid #eee;
            border-radius: 10px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            page-break-inside: avoid;
          }
          .places-print-code {
            font-weight: 700;
            font-size: 16px;
            letter-spacing: 1px;
          }
        }
      `}</style>
    </div>
  );
}