import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { api } from "../../api/http.js";
import { getPublicBaseUrl } from "../../utils/publicBaseUrl";

/*
  QR DINAMIK
  - Gjeneron kode (p.sh. 150) me një klikim.
  - Linku fizik i QR-it (/api/qr/KODI) nuk ndryshon kurrë.
  - Ti ndryshon vetëm "target"-in (ku ridrejton) kur të duash.
*/

export default function DynamicQrPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showGen, setShowGen] = useState(false);
  const [genCount, setGenCount] = useState("");
  const [genPrefix, setGenPrefix] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  // drafts për editim inline
  const [drafts, setDrafts] = useState({}); // { [id]: { label, target } }

  const baseUrl = useMemo(() => getPublicBaseUrl(), []);
  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const qrLink = useCallback(
    (code) => `${baseUrl}/api/qr/${encodeURIComponent(code)}`,
    [baseUrl]
  );

  const fetchList = useCallback(async () => {
    if (!businessId) {
      setError("Mungon businessId. Hyni si menaxher.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/qr/manage/list", { params: { businessId } });
      const list = Array.isArray(res.data) ? res.data : [];
      setItems(list);
      const d = {};
      list.forEach((it) => {
        d[it._id] = { label: it.label || "", target: it.target || "" };
      });
      setDrafts(d);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        String(it.code || "").toLowerCase().includes(q) ||
        String(it.label || "").toLowerCase().includes(q) ||
        String(it.target || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleGenerate = async () => {
    const total = Number(genCount);
    if (!Number.isInteger(total) || total <= 0 || total > 500) {
      setError("Vendos një numër të saktë (1–500)");
      return;
    }
    setGenLoading(true);
    setError("");
    try {
      await api.post("/qr/manage/generate", {
        businessId,
        total,
        labelPrefix: genPrefix.trim(),
      });
      setGenCount("");
      setGenPrefix("");
      setShowGen(false);
      await fetchList();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim");
    } finally {
      setGenLoading(false);
    }
  };

  const setDraft = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const saveItem = async (id) => {
    const d = drafts[id] || {};
    try {
      const res = await api.patch(`/qr/manage/${id}`, {
        label: d.label,
        target: d.target,
      });
      setItems((prev) => prev.map((it) => (it._id === id ? res.data : it)));
      setDraft(id, "target", res.data.target || "");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim gjatë ruajtjes");
    }
  };

  const toggleActive = async (id, next) => {
    try {
      const res = await api.patch(`/qr/manage/${id}`, { isActive: next });
      setItems((prev) => prev.map((it) => (it._id === id ? res.data : it)));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim");
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm("Fshi këtë QR?")) return;
    try {
      await api.delete(`/qr/manage/${id}`);
      setItems((prev) => prev.filter((it) => it._id !== id));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim gjatë fshirjes");
    }
  };

  const copyLink = async (code) => {
    try {
      await navigator.clipboard.writeText(qrLink(code));
    } catch {
      // ignore
    }
  };

  const downloadPng = (id, code) => {
    const box = document.getElementById(`qrbox-${id}`);
    if (!box) return;
    const svg = box.querySelector("svg");
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
      link.download = `qr-${code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = svgUrl;
  };

  const isDirty = (it) => {
    const d = drafts[it._id] || {};
    return (d.label || "") !== (it.label || "") || (d.target || "") !== (it.target || "");
  };

  return (
    <div style={S.page}>
      <div style={S.top}>
        <h1 style={S.title}>QR Dinamik</h1>
        <button style={S.primaryBtn} onClick={() => setShowGen(true)}>
          + Gjenero QR
        </button>
      </div>

      <p style={S.hint}>
        Printo QR-in një herë. Linku ku ridrejton editohet këtu sa herë të duash.
      </p>

      <input
        style={S.search}
        placeholder="Kërko sipas kodit, emrit ose linkut..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div style={S.errorBox}>{error}</div>}

      {loading ? (
        <div style={S.empty}>Duke ngarkuar...</div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>Ende s'ka QR. Kliko "Gjenero QR".</div>
      ) : (
        <div style={S.grid}>
          {filtered.map((it) => {
            const d = drafts[it._id] || { label: "", target: "" };
            const active = it.isActive !== false;
            return (
              <div key={it._id} style={S.card}>
                <div style={S.cardHead}>
                  <span style={{ ...S.badge, background: active ? "#e6f7ec" : "#fdecec", color: active ? "#137a3f" : "#b42318" }}>
                    {active ? "Aktiv" : "Joaktiv"}
                  </span>
                  <span style={S.scans}>{it.scans || 0} skanime</span>
                </div>

                <div id={`qrbox-${it._id}`} style={S.qrBox}>
                  <QRCode value={qrLink(it.code)} size={132} />
                </div>

                <div style={S.code}>{it.code}</div>

                <input
                  style={S.input}
                  placeholder="Emër (opsional)"
                  value={d.label}
                  onChange={(e) => setDraft(it._id, "label", e.target.value)}
                />

                <input
                  style={S.input}
                  placeholder="Linku ku ridrejton (p.sh. google.com/...)"
                  value={d.target}
                  onChange={(e) => setDraft(it._id, "target", e.target.value)}
                />

                <div style={S.row}>
                  <button
                    style={{ ...S.smallBtn, opacity: isDirty(it) ? 1 : 0.5 }}
                    onClick={() => saveItem(it._id)}
                    disabled={!isDirty(it)}
                  >
                    Ruaj
                  </button>
                  <button style={S.ghostBtn} onClick={() => copyLink(it.code)}>
                    Kopjo link
                  </button>
                </div>

                <div style={S.row}>
                  <button style={S.ghostBtn} onClick={() => downloadPng(it._id, it.code)}>
                    Shkarko PNG
                  </button>
                  <button
                    style={S.ghostBtn}
                    onClick={() => toggleActive(it._id, !active)}
                  >
                    {active ? "Çaktivizo" : "Aktivizo"}
                  </button>
                </div>

                <button style={S.deleteBtn} onClick={() => removeItem(it._id)}>
                  Fshi
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showGen && (
        <div style={S.overlay} onClick={() => setShowGen(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Gjenero QR</h2>

            <label style={S.label}>Sa QR?</label>
            <input
              style={S.input}
              type="number"
              placeholder="p.sh. 150"
              value={genCount}
              onChange={(e) => setGenCount(e.target.value)}
            />

            <label style={S.label}>Emër bazë (opsional)</label>
            <input
              style={S.input}
              placeholder="p.sh. Tavolina"
              value={genPrefix}
              onChange={(e) => setGenPrefix(e.target.value)}
            />
            <p style={S.smallHint}>
              Nëse e lë bosh, kodet gjenerohen pa emër. Me "Tavolina" → "Tavolina 1", "Tavolina 2"...
            </p>

            <div style={S.row}>
              <button style={S.ghostBtn} onClick={() => setShowGen(false)}>
                Anulo
              </button>
              <button
                style={S.primaryBtn}
                onClick={handleGenerate}
                disabled={genLoading}
              >
                {genLoading ? "Duke gjeneruar..." : "Gjenero"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page: { padding: 20, maxWidth: 1200, margin: "0 auto" },
  top: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  hint: { color: "#667085", marginTop: 6, marginBottom: 14 },
  search: {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid #d0d5dd", marginBottom: 16, fontSize: 14, boxSizing: "border-box",
  },
  errorBox: {
    background: "#fdecec", color: "#b42318", padding: "10px 12px",
    borderRadius: 10, marginBottom: 14, fontSize: 14,
  },
  empty: { textAlign: "center", color: "#98a2b3", padding: 40 },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16,
  },
  card: {
    border: "1px solid #eaecf0", borderRadius: 14, padding: 16,
    display: "flex", flexDirection: "column", gap: 10, background: "#fff",
    boxShadow: "0 1px 2px rgba(16,24,40,0.05)",
  },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  badge: { fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 999 },
  scans: { fontSize: 12, color: "#98a2b3" },
  qrBox: {
    background: "#fff", padding: 10, borderRadius: 10, border: "1px solid #f2f4f7",
    display: "flex", justifyContent: "center",
  },
  code: { textAlign: "center", fontWeight: 700, letterSpacing: 1, fontSize: 16 },
  input: {
    width: "100%", padding: "9px 11px", borderRadius: 9,
    border: "1px solid #d0d5dd", fontSize: 13, boxSizing: "border-box",
  },
  label: { fontSize: 13, fontWeight: 600, marginTop: 8, display: "block" },
  smallHint: { fontSize: 12, color: "#98a2b3", marginTop: 4 },
  row: { display: "flex", gap: 8 },
  primaryBtn: {
    padding: "10px 16px", borderRadius: 10, border: "none",
    background: "#1570ef", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14,
  },
  smallBtn: {
    flex: 1, padding: "8px 10px", borderRadius: 9, border: "none",
    background: "#1570ef", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13,
  },
  ghostBtn: {
    flex: 1, padding: "8px 10px", borderRadius: 9, border: "1px solid #d0d5dd",
    background: "#fff", color: "#344054", fontWeight: 600, cursor: "pointer", fontSize: 13,
  },
  deleteBtn: {
    padding: "8px 10px", borderRadius: 9, border: "1px solid #fda29b",
    background: "#fff", color: "#b42318", fontWeight: 600, cursor: "pointer", fontSize: 13,
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(16,24,40,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
  },
  modal: {
    background: "#fff", borderRadius: 14, padding: 22, width: "100%", maxWidth: 380,
    display: "flex", flexDirection: "column", gap: 6,
  },
};