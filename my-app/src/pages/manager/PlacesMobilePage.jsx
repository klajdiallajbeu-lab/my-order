import "../../qz-signing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import QRCode from "react-qr-code";
import {
  Utensils,
  BedDouble,
  Umbrella,
  Search,
  Plus,
  QrCode,
  Copy,
  ExternalLink,
  Download,
  Printer,
  Trash2,
  X,
  Check,
  ChevronRight,
} from "lucide-react";

import { api } from "../../api/http.js";
import { getPublicBaseUrl } from "../../utils/publicBaseUrl";
import "./PlacesMobilePage.css";

const normalizeCode = (code) => String(code || "").trim().toUpperCase();

const TYPES = [
  { id: "table", label: "Tavolina", single: "Tavolinë", Icon: Utensils },
  { id: "room", label: "Dhoma", single: "Dhomë", Icon: BedDouble },
  { id: "umbrella", label: "Çadra", single: "Çadër", Icon: Umbrella },
];

export default function PlacesMobilePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlType = String(searchParams.get("type") || "").toLowerCase();
  const initialTab = TYPES.some((t) => t.id === urlType) ? urlType : "table";

  const [tab, setTab] = useState(initialTab);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // sheet-et
  const [qrPlace, setQrPlace] = useState(null); // vendi i hapur në QR sheet
  const [showAdd, setShowAdd] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [tablesCount, setTablesCount] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrRef = useRef(null);
  const baseUrl = useMemo(() => getPublicBaseUrl(), []);

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const activeType = TYPES.find((t) => t.id === tab) || TYPES[0];

  /* ---------- data ---------- */

  const fetchPlaces = useCallback(async () => {
    if (!businessId) {
      setError("Mungon businessId. Hyni si menaxher.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.get("/places", {
        params: { businessId, type: tab },
      });
      setPlaces(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setPlaces([]);
      setError(e?.response?.data?.message || e?.message || "Gabim rrjeti.");
    } finally {
      setLoading(false);
    }
  }, [businessId, tab]);

  useEffect(() => {
    setQrPlace(null);
    setSearch("");
    fetchPlaces();
  }, [fetchPlaces]);

  const pickTab = (id) => {
    setTab(id);
    setSearchParams({ type: id }, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return places;

    return places.filter((p) =>
      String(p.codeNormalized || p.code || "").toLowerCase().includes(q)
    );
  }, [places, search]);

  const activeCount = useMemo(
    () => places.filter((p) => p.isActive !== false).length,
    [places]
  );

  /* ---------- veprime ---------- */

  const toggleActive = async (place) => {
    const next = !(place.isActive !== false);

    try {
      await api.patch(`/places/${place._id}/active`, { isActive: next });
      setPlaces((prev) =>
        prev.map((p) =>
          p._id === place._id ? { ...p, isActive: next } : p
        )
      );
    } catch (e) {
      setError(e?.message || "Gabim rrjeti.");
    }
  };

  const removePlace = async (place) => {
    const ok = window.confirm(
      `Fshi ${activeType.single.toLowerCase()}n "${place.code}"?`
    );
    if (!ok) return;

    setBusy(true);

    try {
      await api.delete(`/places/${place._id}`, { params: { businessId } });
      setQrPlace(null);
      await fetchPlaces();
    } catch (e) {
      setError(e?.message || "Gabim gjatë fshirjes.");
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async () => {
    const codeNorm = normalizeCode(codeInput);
    if (!codeNorm) return;

    if (!/^[A-Z0-9-]+$/.test(codeNorm)) {
      setError("Kodi lejohet vetëm me A-Z, 0-9 dhe '-'.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api.post("/places", { businessId, type: tab, code: codeNorm });
      setCodeInput("");
      setShowAdd(false);
      await fetchPlaces();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim.");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateTables = async () => {
    const total = Number(tablesCount);

    if (!Number.isInteger(total) || total <= 0) {
      setError("Vendos një numër të saktë.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api.post("/places/generate", {
        businessId,
        type: "table",
        total,
      });
      setTablesCount("");
      setShowAdd(false);
      await fetchPlaces();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim.");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- QR helpers ---------- */

  const orderUrl = (place) =>
    place?.qrToken
      ? `${baseUrl}/order/${encodeURIComponent(place.qrToken)}`
      : "";

  const copyLink = async (url) => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const downloadPng = (fileLabel) => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
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

  /* ---------- render ---------- */

  const TypeIcon = activeType.Icon;

  return (
    <div className="pmb-page">
      {/* HERO me segmented control */}
      <section className="pmb-hero">
        <h1>Vendet & QR</h1>

        <div className="pmb-segment">
          {TYPES.map((t) => {
            const SegIcon = t.Icon;

            return (
              <button
                key={t.id}
                type="button"
                className={tab === t.id ? "active" : ""}
                onClick={() => pickTab(t.id)}
              >
                <SegIcon size={16} strokeWidth={2.4} />
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="pmb-body">
        {/* PËRMBLEDHJE + KËRKIM */}
        <div className="pmb-toolbar">
          <div className="pmb-count">
            <TypeIcon size={17} strokeWidth={2.3} />
            <span>
              <b>{places.length}</b> {activeType.label.toLowerCase()}
              {places.length > 0 && (
                <em> · {activeCount} aktive</em>
              )}
            </span>
          </div>

          <div className="pmb-search">
            <Search size={16} strokeWidth={2.4} />
            <input
              type="search"
              placeholder={`Kërko ${activeType.single.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="pmb-error">{error}</div>}

        {/* LISTA */}
        {loading ? (
          <div className="pmb-empty">Duke ngarkuar…</div>
        ) : filtered.length === 0 ? (
          <div className="pmb-empty">
            {search
              ? `S'u gjet asnjë për "${search}".`
              : `Nuk ka ${activeType.label.toLowerCase()} ende. Shto të parën me butonin +.`}
          </div>
        ) : (
          <ul className="pmb-list">
            {filtered.map((place) => {
              const active = place.isActive !== false;

              return (
                <li key={place._id} className="pmb-item">
                  <button
                    type="button"
                    className="pmb-item-main"
                    onClick={() => setQrPlace(place)}
                  >
                    <span
                      className={`pmb-item-icon ${active ? "" : "off"}`}
                    >
                      <TypeIcon size={18} strokeWidth={2.3} />
                    </span>

                    <span className="pmb-item-text">
                      <strong>{place.code}</strong>
                      <em>{active ? "Aktive" : "Joaktive"} · QR & link</em>
                    </span>

                    <QrCode
                      size={17}
                      strokeWidth={2.2}
                      className="pmb-item-qr"
                    />
                    <ChevronRight
                      size={16}
                      strokeWidth={2.4}
                      className="pmb-item-arrow"
                    />
                  </button>

                  {/* switch aktiv/joaktiv */}
                  <button
                    type="button"
                    className={`pmb-switch ${active ? "on" : ""}`}
                    onClick={() => toggleActive(place)}
                    aria-label={active ? "Çaktivizo" : "Aktivizo"}
                  >
                    <span className="pmb-switch-dot" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* BUTONI + */}
      <button
        type="button"
        className="pmb-add"
        onClick={() => {
          setError("");
          setShowAdd(true);
        }}
        aria-label="Shto"
      >
        <Plus size={24} strokeWidth={2.6} />
      </button>

      {/* SHEET: SHTO ---------------------------------------- */}
      {showAdd && (
        <>
          <div className="pmb-overlay" onClick={() => setShowAdd(false)} />

          <div className="pmb-sheet">
            <div className="pmb-sheet-grip" />

            <div className="pmb-sheet-head">
              <h3>Shto {activeType.single.toLowerCase()}</h3>

              <button
                type="button"
                className="pmb-close"
                onClick={() => setShowAdd(false)}
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {tab === "table" && (
              <div className="pmb-field-group">
                <label>Gjenero shumë tavolina njëherësh</label>

                <div className="pmb-inline">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    placeholder="p.sh. 20"
                    value={tablesCount}
                    onChange={(e) => setTablesCount(e.target.value)}
                  />

                  <button
                    type="button"
                    className="pmb-btn"
                    onClick={handleGenerateTables}
                    disabled={busy}
                  >
                    Gjenero
                  </button>
                </div>

                <div className="pmb-or">ose shto një me kod</div>
              </div>
            )}

            <div className="pmb-field-group">
              <label>
                Kodi i {activeType.single.toLowerCase()}s (A-Z, 0-9, -)
              </label>

              <div className="pmb-inline">
                <input
                  type="text"
                  placeholder={tab === "room" ? "p.sh. 201" : "p.sh. A1"}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                />

                <button
                  type="button"
                  className="pmb-btn"
                  onClick={handleAdd}
                  disabled={busy || !codeInput.trim()}
                >
                  Shto
                </button>
              </div>
            </div>

            {error && <div className="pmb-error">{error}</div>}
          </div>
        </>
      )}

      {/* SHEET: QR ------------------------------------------ */}
      {qrPlace && (
        <>
          <div className="pmb-overlay" onClick={() => setQrPlace(null)} />

          <div className="pmb-sheet">
            <div className="pmb-sheet-grip" />

            <div className="pmb-sheet-head">
              <h3>
                {activeType.single} {qrPlace.code}
              </h3>

              <button
                type="button"
                className="pmb-close"
                onClick={() => setQrPlace(null)}
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="pmb-qr-box" ref={qrRef}>
              {orderUrl(qrPlace) ? (
                <QRCode value={orderUrl(qrPlace)} size={190} />
              ) : (
                <div className="pmb-empty">Ky vend s'ka QR token.</div>
              )}
            </div>

            <div className="pmb-qr-actions">
              <button
                type="button"
                onClick={() => copyLink(orderUrl(qrPlace))}
              >
                {copied ? (
                  <Check size={18} strokeWidth={2.5} />
                ) : (
                  <Copy size={18} strokeWidth={2.2} />
                )}
                {copied ? "U kopjua" : "Kopjo"}
              </button>

              <button
                type="button"
                onClick={() =>
                  window.open(orderUrl(qrPlace), "_blank")
                }
              >
                <ExternalLink size={18} strokeWidth={2.2} />
                Hap
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadPng(
                    `${activeType.single.toLowerCase()}-${qrPlace.code}`
                  )
                }
              >
                <Download size={18} strokeWidth={2.2} />
                Shkarko
              </button>

              <button type="button" onClick={() => window.print()}>
                <Printer size={18} strokeWidth={2.2} />
                Printo
              </button>
            </div>

            <button
              type="button"
              className="pmb-delete"
              onClick={() => removePlace(qrPlace)}
              disabled={busy}
            >
              <Trash2 size={17} strokeWidth={2.3} />
              Fshi {activeType.single.toLowerCase()}n
            </button>
          </div>
        </>
      )}
    </div>
  );
}