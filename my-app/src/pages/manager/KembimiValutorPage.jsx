import "../../qz-signing";
import { useEffect, useState, useCallback } from "react";
import "./KembimiValutorPage.css";
import { api } from "../../api/http.js";
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

  const [rates, setRates] = useState({ eurRate: "", usdRate: "", chfRate: "", gbpRate: "" });
  const [liveRates, setLiveRates] = useState({ EUR: null, USD: null, CHF: null, GBP: null });

  const [selectedChartCurrency, setSelectedChartCurrency] = useState("EUR");
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const handleChange = (key, value) => {
    setRates((prev) => ({ ...prev, [key]: value }));
  };

  const getDiff = (manual, live) => {
    const m = Number(manual);
    const l = Number(live);
    if (!Number.isFinite(m) || m <= 0 || !Number.isFinite(l) || l <= 0) return null;
    const diff = m - l;
    return { value: Math.abs(diff).toFixed(2), positive: diff >= 0 };
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
      const res = await api.get(`/business/${businessId}/settings`);
      const s = res.data?.settings || {};

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
  }, [businessId]);

  const loadLatestLiveRates = useCallback(async () => {
    try {
      const res = await fetch("https://api.frankfurter.dev/v2/rates?base=ALL&quotes=EUR,USD,CHF,GBP");
      const data = await res.json();

      const mapped = { EUR: null, USD: null, CHF: null, GBP: null };

      if (Array.isArray(data)) {
        for (const row of data) {
          if (!row?.quote || !row?.rate) continue;
          mapped[row.quote] = Number((1 / row.rate).toFixed(2));
        }
      }

      setLiveRates(mapped);
      setLastUpdated(new Date());
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
            date: row.date,
            label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
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

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadLatestLiveRates(); }, [loadLatestLiveRates]);
  useEffect(() => { loadChartData(); }, [loadChartData]);

  const refreshAll = () => {
    loadLatestLiveRates();
    loadChartData();
  };

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
      const res = await api.patch(`/business/${businessId}/settings`, payload);
      const s = res.data?.settings || {};

      setRates({
        eurRate: s.eurRate !== undefined ? String(s.eurRate) : "",
        usdRate: s.usdRate !== undefined ? String(s.usdRate) : "",
        chfRate: s.chfRate !== undefined ? String(s.chfRate) : "",
        gbpRate: s.gbpRate !== undefined ? String(s.gbpRate) : "",
      });

      setMsg("✅ Kurset valutore u përditësuan me sukses.");
    } catch (error) {
      console.error(error);
      setMsg(error?.response?.data?.message || "❌ Gabim serveri.");
    } finally {
      setSaving(false);
    }
  };

  const formatUpdated = (d) => {
    if (!d) return "-";
    return `${d.toLocaleDateString("sq-AL")} ${d.toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="exchange-page">
      <div className="exchange-top-bar">
        <div>
          <h1>Këmbimi Valutor</h1>
          <p>Vendos manualisht kursin e këmbimit për monedhat që përdor biznesi yt.</p>
        </div>

        <button className="save-btn" onClick={save} disabled={saving || loading}>
          {saving ? "Duke ruajtur..." : "Ruaj ndryshimet"}
        </button>
      </div>

      {loading ? (
        <div className="exchange-loading">Duke ngarkuar të dhënat...</div>
      ) : (
        <>
          <div className="exchange-card">
            <div className="exchange-card-top">
              <h2>Përditëso kurset</h2>
              <span className="exchange-subtext">Baza e konvertimit: ALL</span>
            </div>

            <div className="exchange-grid">
              {currencies.map((currency) => {
                const live = liveRates[currency.code];
                const manual = rates[currency.key];
                const diff = getDiff(manual, live);

                return (
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
                        value={rates[currency.key]}
                        onChange={(e) => handleChange(currency.key, e.target.value)}
                      />
                      <span>ALL</span>
                    </div>

                    <div className="currency-live-row">
                      <span>Kursi live: {live ? `${live} ALL` : "-"}</span>
                      {diff && (
                        <span className={`currency-diff ${diff.positive ? "up" : "down"}`}>
                          {diff.positive ? "▲" : "▼"} {diff.value} ALL
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {msg && (
              <div className={`exchange-message ${msg.startsWith("✅") ? "success" : "error"}`}>{msg}</div>
            )}
          </div>

          <div className="exchange-bottom-grid">
            <div className="exchange-card chart-card">
              <div className="exchange-card-top exchange-chart-head">
                <div>
                  <h2>Exchange Trend <span className="chart-tag">({selectedChartCurrency})</span></h2>
                  <span className="exchange-subtext">Trend 1-vjetor i kursit të tregut</span>
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
                  <div className="chart-placeholder">Duke ngarkuar grafikun...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="label" interval="preserveStartEnd" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={["auto", "auto"]} tickCount={4} width={40} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #ececec", background: "#fff", fontSize: 12 }} />
                      <Line type="monotone" dataKey="live" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="exchange-card market-card">
              <div className="exchange-card-top">
                <h2>Live Market Overview</h2>
                <span className="exchange-subtext">Vështrim i shpejtë i kurseve live</span>
              </div>

              <div className="market-table">
                <div className="market-table-head">
                  <span>Monedha</span>
                  <span>Kursi yt (ALL)</span>
                  <span>Kursi live (ALL)</span>
                  <span>Ndryshimi</span>
                </div>

                {currencies.map((currency) => {
                  const live = liveRates[currency.code];
                  const manual = rates[currency.key];
                  const diff = getDiff(manual, live);

                  return (
                    <div className="market-table-row" key={currency.code}>
                      <div className="market-cell-main">
                        <div className="market-badge">{currency.symbol}</div>
                        <div>
                          <div className="market-code">{currency.code}</div>
                          <div className="market-label">{currency.label}</div>
                        </div>
                      </div>

                      <span>{manual || "-"}</span>
                      <span>{live || "-"}</span>

                      <span className={diff ? `market-diff ${diff.positive ? "up" : "down"}` : "market-diff neutral"}>
                        {diff ? `${diff.positive ? "▲" : "▼"} ${diff.value}` : "-"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="exchange-info-bar">
            <div className="info-left">
              <span className="info-icon">ⓘ</span>
              <div>
                <b>Informacion</b>
                <p>Kursi live përditësohet automatikisht nga tregu. Kursi yt është ai që përdoret për faturim dhe konvertime në sistem.</p>
              </div>
            </div>

            <div className="info-right">
              <span className="info-updated">
                Përditësuar së fundmi<br />
                <b>{formatUpdated(lastUpdated)}</b>
              </span>
              <button className="refresh-btn" onClick={refreshAll} type="button">
                ⟳ Përditëso tani
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}