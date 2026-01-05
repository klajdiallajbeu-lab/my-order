import { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://192.168.100.71:5000";

export default function SettingsPage() {
  const businessId = localStorage.getItem("businessId");

  const [loading, setLoading] = useState(true);
  const [eurRate, setEurRate] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setSavedMsg("");

        if (!businessId) {
          setError("Nuk u gjet businessId. Bëj login si manager.");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/business/${businessId}/settings`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Gabim gjatë leximit të settings");
          setLoading(false);
          return;
        }

        setEurRate(String(data?.settings?.eurRate ?? 100));
      } catch (e) {
        setError("Nuk u lidh me serverin");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId]);

  const save = async () => {
    try {
      setError("");
      setSavedMsg("");

      const rateNum = Number(eurRate);
      if (!Number.isFinite(rateNum) || rateNum <= 0) {
        setError("Shkruaj një kurs të vlefshëm (p.sh. 100).");
        return;
      }

      const res = await fetch(`${API_BASE}/api/business/${businessId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eurRate: rateNum,
          baseCurrency: "ALL",
          showCurrencies: ["ALL", "EUR"],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Gabim gjatë ruajtjes");
        return;
      }

      setSavedMsg("✅ Kursi u ruajt me sukses");
    } catch (e) {
      setError("Nuk u lidh me serverin");
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Duke ngarkuar...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 520 }}>
      <h2>⚙️ Settings</h2>

      {error && (
        <div style={{ marginTop: 10, color: "crimson" }}>
          ❌ {error}
        </div>
      )}

      {savedMsg && (
        <div style={{ marginTop: 10, color: "green" }}>
          {savedMsg}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Kursi EUR (sa ALL = 1 EUR)
        </label>

        <input
          value={eurRate}
          onChange={(e) => setEurRate(e.target.value)}
          placeholder="p.sh. 100"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />

        <button
          onClick={save}
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
          }}
        >
          Ruaj kursin
        </button>
      </div>
    </div>
  );
}
