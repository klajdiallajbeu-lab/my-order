import { useEffect, useState, useCallback } from "react";
import "./KembimiValutorPage.css";

export default function KembimiValutorPage() {
  const businessId = localStorage.getItem("businessId");
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [inputEurRate, setInputEurRate] = useState("");
  const [inputUsdRate, setInputUsdRate] = useState("");
  const [msg, setMsg] = useState("");

  const loadSettings = useCallback(async () => {
    if (!businessId) {
      setMsg("❌ businessId mungon (login përsëri).");
      return;
    }

    try {
      setMsg("");
      const res = await fetch(`${API_BASE}/api/business/${businessId}/settings`);
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "❌ Nuk u lexuan settings");
        return;
      }

      const s = data?.settings || {};
      if (s.eurRate !== undefined) setInputEurRate(String(s.eurRate));
      if (s.usdRate !== undefined) setInputUsdRate(String(s.usdRate));
    } catch (e) {
      console.error(e);
      setMsg("❌ Gabim rrjeti / serveri");
    }
  }, [API_BASE, businessId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const save = async () => {
    const eur = Number(inputEurRate);
    const usd = Number(inputUsdRate);

    if (!Number.isFinite(eur) || eur <= 0 || !Number.isFinite(usd) || usd <= 0) {
      setMsg("❌ Vendos kurse të vlefshme për EUR dhe USD");
      return;
    }

    try {
      setMsg("");

      const res = await fetch(`${API_BASE}/api/business/${businessId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eurRate: eur, usdRate: usd }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "❌ Gabim gjatë ruajtjes");
        return;
      }

      // optional: sinkronizo inputet me ato që kthen backend
      if (data?.settings?.eurRate !== undefined) setInputEurRate(String(data.settings.eurRate));
      if (data?.settings?.usdRate !== undefined) setInputUsdRate(String(data.settings.usdRate));

      setMsg("✅ Kurset u përditësuan me sukses");
    } catch (e) {
      console.error(e);
      setMsg("❌ Gabim serveri");
    }
  };

  return (
    <div className="exchange-page">
      <div className="exchange-card edit">
        <div className="label">Përditëso kursin</div>

        <div className="input-row" style={{ marginBottom: 15 }}>
          <span>1 EUR =</span>
          <input
            type="number"
            value={inputEurRate}
            onChange={(e) => setInputEurRate(e.target.value)}
            placeholder="p.sh 102"
          />
          <span>ALL</span>
        </div>

        <div className="input-row">
          <span>1 USD =</span>
          <input
            type="number"
            value={inputUsdRate}
            onChange={(e) => setInputUsdRate(e.target.value)}
            placeholder="p.sh 94"
          />
          <span>ALL</span>
        </div>

        <button onClick={save} style={{ marginTop: 20 }}>
          Ruaj ndryshimin
        </button>

        {msg && <div className="message">{msg}</div>}
      </div>
    </div>
  );
}
