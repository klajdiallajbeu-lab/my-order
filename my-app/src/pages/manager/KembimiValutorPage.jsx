import { useEffect, useState, useCallback } from "react";
import "./KembimiValutorPage.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const currencies = [
  { code: "EUR", label: "Euro", symbol: "€", key: "eurRate" },
  { code: "USD", label: "US Dollar", symbol: "$", key: "usdRate" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF", key: "chfRate" },
  { code: "GBP", label: "British Pound", symbol: "£", key: "gbpRate" },
];

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getPastDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

export default function KembimiValutorPage() {
  const businessId = localStorage.getItem("businessId");
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [rates, setRates] = useState({
    eurRate: "",
    usdRate: "",
    chfRate: "",
    gbpRate: "",
  });

  const [liveRates, setLiveRates] = useState({
    EUR: null,
    USD: null,
    CHF: null,
    GBP: null,
  });

  const [selectedChartCurrency, setSelectedChartCurrency] = useState("EUR");
  const [chartData, setChartData] = useState([]);

  
  const [chartLoading, setChartLoading] = useState(false);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => {
    setRates((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getDiff = (manual, live) => {
    const m = Number(manual);
    const l = Number(live);

    if (!Number.isFinite(m) || m <= 0 || !Number.isFinite(l) || l <= 0) {
      return null;
    }

    const diff = m - l;

    return {
      value: Math.abs(diff).toFixed(2),
      positive: diff >= 0,
    };
  };

  const loadSettings = useCallback(async () => {
    if (!businessId) {
      setMsg("❌ businessId mungon. Bëj login përsëri.");
      setLoading(false);
      return;
    }

    try {
      setMsg("");
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/business/${businessId}/settings`);
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "❌ Nuk u lexuan settings.");
        setLoading(false);
        return;
      }

      const s = data?.settings || {};

      setRates({
        eurRate: s.eurRate !== undefined ? String(s.eurRate) : "",
        usdRate: s.usdRate !== undefined ? String(s.usdRate) : "",
        chfRate: s.chfRate !== undefined ? String(s.chfRate) : "",
        gbpRate: s.gbpRate !== undefined ? String(s.gbpRate) : "",
      });
    } catch (error) {
      console.error(error);
      setMsg("❌ Gabim rrjeti / serveri.");
    } finally {
      setLoading(false);
    }
  }, [API_BASE, businessId]);

  const loadLatestLiveRates = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.frankfurter.dev/v2/rates?base=ALL&quotes=EUR,USD,CHF,GBP"
      );
      const data = await res.json();

      const mapped = {
        EUR: null,
        USD: null,
        CHF: null,
        GBP: null,
      };

      if (Array.isArray(data)) {
        for (const row of data) {
          if (!row?.quote || !row?.rate) continue;

          // API kthen ALL -> EUR, ndërsa ty të duhet 1 EUR = X ALL
          mapped[row.quote] = Number((1 / row.rate).toFixed(2));
        }
      }

      setLiveRates(mapped);
    } catch (err) {
      console.error("Gabim te loadLatestLiveRates:", err);
    }
  }, []);

  const loadChartData = useCallback(async () => {
    try {
      setChartLoading(true);

      const from = getPastDate(365);
      const to = formatDate(new Date());

      const res = await fetch(
        `https://api.frankfurter.dev/v2/rates?base=ALL&quotes=${selectedChartCurrency}&from=${from}&to=${to}`
      );
      const data = await res.json();

      if (!Array.isArray(data)) {
        setChartData([]);
        return;
      }

      const normalized = data
        .filter((row) => row?.date && row?.rate)
        .map((row) => {
  const d = new Date(row.date);

  return {
    date: row.date, // ruaj datën e plotë
    label: d.toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
    }),
    live: Number((1 / row.rate).toFixed(2)),
  };
});

      setChartData(normalized);
    } catch (err) {
      console.error("Gabim te loadChartData:", err);
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [selectedChartCurrency]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadLatestLiveRates();
  }, [loadLatestLiveRates]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const save = async () => {
    if (!businessId) {
      setMsg("❌ businessId mungon. Bëj login përsëri.");
      return;
    }

    const payload = {};

    for (const currency of currencies) {
      const rawValue = rates[currency.key];

      if (rawValue === "") continue;

      const numericValue = Number(rawValue);

      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        setMsg(`❌ Vendos kurs të vlefshëm për ${currency.code}.`);
        return;
      }

      payload[currency.key] = numericValue;
    }

    if (Object.keys(payload).length === 0) {
      setMsg("❌ Plotëso të paktën një kurs valutor.");
      return;
    }

    try {
      setSaving(true);
      setMsg("");

      const res = await fetch(`${API_BASE}/api/business/${businessId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "❌ Gabim gjatë ruajtjes.");
        return;
      }

      const s = data?.settings || {};

      setRates({
        eurRate: s.eurRate !== undefined ? String(s.eurRate) : "",
        usdRate: s.usdRate !== undefined ? String(s.usdRate) : "",
        chfRate: s.chfRate !== undefined ? String(s.chfRate) : "",
        gbpRate: s.gbpRate !== undefined ? String(s.gbpRate) : "",
      });

      setMsg("✅ Kurset valutore u përditësuan me sukses.");
    } catch (error) {
      console.error(error);
      setMsg("❌ Gabim serveri.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="exchange-page">
      <div className="exchange-header">
        <div>
          <h1>Këmbimi Valutor</h1>
          <p>Vendos manualisht kursin e këmbimit për monedhat që përdor biznesi yt.</p>
        </div>
      </div>

      <div className="exchange-card">
        <div className="exchange-card-top">
          <div>
            <h2>Përditëso kurset</h2>
            <span className="exchange-subtext">Baza e konvertimit: ALL</span>
          </div>
        </div>

        {loading ? (
          <div className="exchange-loading">Duke ngarkuar të dhënat...</div>
        ) : (
          <>
            <div className="exchange-grid">
              {currencies.map((currency) => (
                <div className="currency-card" key={currency.code}>
                  <div className="currency-card-header">
                    <div className="currency-badge">{currency.symbol}</div>
                    <div>
                      <h3>{currency.code}</h3>
                      <p>{currency.label}</p>
                    </div>
                  </div>

                  <label className="currency-label">1 {currency.code} =</label>

                  <div className="currency-input-row">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={`Shkruaj kursin për ${currency.code}`}
                      value={rates[currency.key]}
                      onChange={(e) => handleChange(currency.key, e.target.value)}
                    />
                    <span>ALL</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="exchange-actions">
              <button onClick={save} disabled={saving}>
                {saving ? "Duke ruajtur..." : "Ruaj ndryshimet"}
              </button>
            </div>

            {msg && (
              <div
                className={`exchange-message ${
                  msg.startsWith("✅") ? "success" : "error"
                }`}
              >
                {msg}
              </div>
            )}
          </>
        )}
      </div>

      {!loading && (
        <>
          <div className="exchange-card exchange-section-gap">
            <div className="exchange-card-top">
              <div>
                <h2>Live Market Overview</h2>
                <span className="exchange-subtext">
                  Vetëm për informacion, jo për faturim automatik
                </span>
              </div>
            </div>

            <div className="live-grid">
              {currencies.map((currency) => {
                const live = liveRates[currency.code];
                const manual = rates[currency.key];
                const diff = getDiff(manual, live);

                return (
                  <div className="live-card" key={currency.code}>
                    <div className="live-top">
                      <div className="live-code-wrap">
                        <div className="live-code">{currency.code}</div>
                        <div className="live-label">{currency.label}</div>
                      </div>
                      <div className="live-symbol">{currency.symbol}</div>
                    </div>

                    <div className="live-row">
                      <span>Kursi yt</span>
                      <strong>{manual || "-"} ALL</strong>
                    </div>

                    <div className="live-row">
                      <span>Kursi live</span>
                      <strong>{live ? `${live} ALL` : "-"}</strong>
                    </div>

                    {diff ? (
                      <div
                        className={`live-diff ${diff.positive ? "positive" : "negative"}`}
                      >
                        {diff.positive ? "▲" : "▼"} {diff.value} ALL
                      </div>
                    ) : (
                      <div className="live-diff neutral">Pa krahasim</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="exchange-card exchange-section-gap">
            <div className="exchange-card-top exchange-chart-head">
              <div>
                <h2>Exchange Trend</h2>
                <span className="exchange-subtext">
                  Trend 1-vjetor i kursit të tregut
                </span>
              </div>

              <select
                className="exchange-select"
                value={selectedChartCurrency}
                onChange={(e) => setSelectedChartCurrency(e.target.value)}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="CHF">CHF</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="chart-wrap">
  {chartLoading ? (
    <div className="chart-placeholder">
      <div className="chart-placeholder-title">
        Duke ngarkuar grafikun...
      </div>
    </div>
  ) : (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart
        data={chartData}
        margin={{
          top: 20,
          right: 24,
          left: 10,
          bottom: 20,
        }}
      >
        <CartesianGrid
          strokeDasharray="4 4"
          vertical={false}
          stroke="#dbeafe"
        />

        <XAxis
          dataKey="label"
          interval="preserveStartEnd"
          tick={{
            fill: "#64748b",
            fontSize: 12,
          }}
          tickMargin={12}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          domain={["auto", "auto"]}
          tickCount={5}
          width={55}
          tick={{
            fill: "#64748b",
            fontSize: 12,
          }}
          axisLine={false}
          tickLine={false}
        />

        <Tooltip
          contentStyle={{
            borderRadius: "16px",
            border: "1px solid #dbeafe",
            background: "#ffffff",
            boxShadow:
              "0 14px 34px rgba(37,99,235,.10)",
          }}
          labelStyle={{
            color: "#64748b",
            fontWeight: 700,
          }}
        />

        <Line
          type="monotone"
          dataKey="live"
          stroke="#2563eb"
          strokeWidth={4}
          dot={false}
          activeDot={{
            r: 7,
            fill: "#2563eb",
            stroke: "#ffffff",
            strokeWidth: 3,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )}
</div>
          </div>
        </>
      )}
    </div>
  );
}