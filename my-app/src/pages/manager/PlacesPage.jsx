import { useCallback, useEffect, useMemo, useState } from "react";
import "./PlacesPage.css";
import { getPublicBaseUrl } from "../../utils/publicBaseUrl";

const normalizeCode = (code) => String(code || "").trim().toUpperCase();
const isHHMM = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ""));

export default function PlacesPage() {
  const [tab, setTab] = useState("room");
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);

  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");

  const [tablesCount, setTablesCount] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const [oaLoading, setOaLoading] = useState(false);
  const [oaError, setOaError] = useState("");
  const [oaSavedMsg, setOaSavedMsg] = useState("");
  const [orderAccess, setOrderAccess] = useState({
    enabled: false,
    windowStart: "23:00",
    windowEnd: "07:00",
    applyTo: ["room", "umbrella"],
  });

  const [showDisablePanel, setShowDisablePanel] = useState(false);

  const tabLabel =
    tab === "room" ? "Dhoma" : tab === "umbrella" ? "Cadra" : "Tavolina";

  const fetchPlaces = useCallback(async () => {
    if (!businessId) {
      setError("Mungon businessId. Hyni si menaxher.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `/api/places?businessId=${encodeURIComponent(
          businessId
        )}&type=${encodeURIComponent(tab)}`
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Nuk u mor lista.");

      setPlaces(Array.isArray(data) ? data : []);
    } catch (e) {
      setPlaces([]);
      setError(e?.message || "Gabim. Kontrollo backend.");
    } finally {
      setLoading(false);
    }
  }, [businessId, tab]);

  const fetchOrderAccess = useCallback(async () => {
    if (!businessId) return;

    setOaError("");
    setOaSavedMsg("");
    setOaLoading(true);

    try {
      const res = await fetch(
        `/api/business/order-access?businessId=${encodeURIComponent(businessId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Nuk u mor order access.");

      setOrderAccess((prev) => ({
        ...prev,
        enabled: !!data?.enabled,
        windowStart: isHHMM(data?.windowStart)
          ? data.windowStart
          : prev.windowStart,
        windowEnd: isHHMM(data?.windowEnd) ? data.windowEnd : prev.windowEnd,
        applyTo:
          Array.isArray(data?.applyTo) && data.applyTo.length
            ? data.applyTo
            : prev.applyTo,
      }));
    } catch (e) {
      setOaError(e?.message || "Gabim gjatë marrjes së settings.");
    } finally {
      setOaLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  useEffect(() => {
    fetchOrderAccess();
  }, [fetchOrderAccess]);

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
      const res = await fetch(`/api/places/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
          type: "table",
          total,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Gabim");

      setTablesCount("");
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
      const res = await fetch(`/api/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, type: tab, code: codeNorm }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "S’u shtua kodi.");

      setCodeInput("");
      await fetchPlaces();
    } catch (e) {
      setError(e?.message || "Gabim.");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (placeId, nextActive) => {
    try {
      const res = await fetch(`/api/places/${placeId}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Gabim.");

      setPlaces((prev) =>
        prev.map((p) => (p._id === placeId ? { ...p, isActive: nextActive } : p))
      );
    } catch (e) {
      setError(e?.message || "Gabim rrjeti.");
    }
  };

  const copyOrderLink = async (token) => {
    const baseUrl = getPublicBaseUrl();
    const url = `${baseUrl}/order/${encodeURIComponent(token)}`;

    if (!token) {
      setError("Link i pavlefshëm.");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setError("");
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        document.execCommand("copy");
        document.body.removeChild(textarea);

        setError("");
      } catch {
        setError("Nuk u kopjua linku.");
      }
    }
  };

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
      const res = await fetch(`/api/business/order-access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          enabled: orderAccess.enabled,
          windowStart: orderAccess.windowStart,
          windowEnd: orderAccess.windowEnd,
          applyTo: orderAccess.applyTo,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Gabim.");

      setOaSavedMsg("U ruajt me sukses.");
    } catch (e) {
      setOaError(e?.message || "Gabim.");
    } finally {
      setOaLoading(false);
    }
  };

  return (
    <div className="places-page">
      <div className="places-wrap">
        <div className="places-hero">
          <div className="places-hero-badge">
            <div>
              <div className="places-hero-kicker">Menaxhim</div>
              <h1 className="places-title">Dhoma / Cadra / Tavolina</h1>
            </div>
          </div>
        </div>

        <div className="places-tabs">
          <button
            className={`places-tab ${tab === "table" ? "active" : ""}`}
            onClick={() => setTab("table")}
            type="button"
          >
            Tavolina
          </button>

          <button
            className={`places-tab ${tab === "room" ? "active" : ""}`}
            onClick={() => setTab("room")}
            type="button"
          >
            Dhoma
          </button>

          <button
            className={`places-tab ${tab === "umbrella" ? "active" : ""}`}
            onClick={() => setTab("umbrella")}
            type="button"
          >
            Cadra
          </button>
        </div>

        <div className="places-card places-card--narrow places-add-card">
          <div className="places-card-head">
            <div>
              <div className="places-card-kicker">Shto njësi të re</div>
              <h2>Shto {tabLabel}</h2>
            </div>
          </div>

          {tab === "table" ? (
            <div className="places-add">
              <input
                className="places-input"
                type="number"
                placeholder="Sa tavolina? p.sh 20"
                value={tablesCount}
                onChange={(e) => setTablesCount(e.target.value)}
              />

              <button
                className="places-btn"
                onClick={handleGenerateTables}
                disabled={genLoading}
                type="button"
              >
                {genLoading ? "Duke krijuar..." : "Gjenero"}
              </button>
            </div>
          ) : (
            <div className="places-add">
              <input
                className="places-input"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="A130 / B250"
              />

              <button className="places-btn" onClick={handleAdd} type="button">
                Shto
              </button>
            </div>
          )}

          {error && <div className="places-alert err">{error}</div>}
        </div>

        <div className="places-card">
          <div className="places-list-head">
            <div>
              <div className="places-card-kicker">Menaxho njësitë</div>
              <h2 className="places-list-title">Lista ({tabLabel})</h2>
            </div>

            <div className="places-head-actions">
              <button
                type="button"
                className={`places-mini-btn ${
                  orderAccess.enabled ? "is-danger" : "is-neutral"
                }`}
                onClick={() => setShowDisablePanel((v) => !v)}
              >
                {orderAccess.enabled ? "ON" : "OFF"} Disable All
              </button>

              <button
                className="places-mini-btn"
                onClick={fetchPlaces}
                disabled={loading}
                type="button"
              >
                Rifresko
              </button>
            </div>
          </div>

          {showDisablePanel && (
            <div className="places-access-panel">
              <div className="places-access-row">
                <button
                  type="button"
                  className={`places-mini-btn ${
                    orderAccess.enabled ? "is-success" : "is-danger"
                  }`}
                  onClick={() =>
                    setOrderAccess((p) => ({ ...p, enabled: !p.enabled }))
                  }
                >
                  {orderAccess.enabled ? "Aktiv" : "I çaktivizuar"}
                </button>

                <input
                  className="places-input places-time-input"
                  type="time"
                  step="60"
                  value={orderAccess.windowStart || "23:00"}
                  onChange={(e) =>
                    setOrderAccess((p) => ({
                      ...p,
                      windowStart: e.target.value,
                    }))
                  }
                />

                <input
                  className="places-input places-time-input"
                  type="time"
                  step="60"
                  value={orderAccess.windowEnd || "07:00"}
                  onChange={(e) =>
                    setOrderAccess((p) => ({
                      ...p,
                      windowEnd: e.target.value,
                    }))
                  }
                />

                <button
                  type="button"
                  className="places-mini-btn is-primary"
                  onClick={saveOrderAccess}
                  disabled={oaLoading}
                >
                  {oaLoading ? "Duke ruajtur..." : "Ruaj"}
                </button>
              </div>

              {oaError && <div className="places-alert err">{oaError}</div>}
              {oaSavedMsg && <div className="places-alert ok">{oaSavedMsg}</div>}
            </div>
          )}

          {loading ? (
            <div className="places-empty-state">Duke ngarkuar...</div>
          ) : places.length === 0 ? (
            <div className="places-empty-state">
              Nuk ka asnjë {tabLabel.toLowerCase()} të regjistruar.
            </div>
          ) : (
            <div className="places-list">
              {places.map((p) => (
                <div key={p._id} className="places-row">
                  <div className="places-code">
                    <b>{p.codeNormalized || p.code}</b>
                    <div className="places-meta">{p.type}</div>
                  </div>

                  <span
                    className={`places-badge ${
                      p.isActive !== false ? "active" : "inactive"
                    }`}
                  >
                    {p.isActive !== false ? "Active" : "Inactive"}
                  </span>

                  <div className="places-actions">
                    <button
                      className={`places-act ${
                        p.isActive !== false ? "danger" : "success"
                      }`}
                      onClick={() => toggleActive(p._id, p.isActive === false)}
                      type="button"
                    >
                      {p.isActive !== false ? "Disable" : "Enable"}
                    </button>

                    <button
                      className="places-act copy"
                      onClick={() => copyOrderLink(p.qrToken)}
                      type="button"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}