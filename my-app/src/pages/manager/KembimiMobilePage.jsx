import "../../qz-signing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, RefreshCw, Check } from "lucide-react";

import { api } from "../../api/http.js";
import "./KembimiMobilePage.css";

const CURRENCIES = [
  { code: "EUR", label: "Euro", symbol: "€", key: "eurRate" },
  { code: "USD", label: "US Dollar", symbol: "$", key: "usdRate" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF", key: "chfRate" },
  { code: "GBP", label: "British Pound", symbol: "£", key: "gbpRate" },
];

export default function KembimiMobilePage() {
  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  /* ---------- data ---------- */

  const loadSettings = useCallback(async () => {
    if (!businessId) {
      setError("Mungon businessId. Hyni si menaxher.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.get(`/business/${businessId}/settings`);
      const s = res.data || {};

      setRates({
        eurRate: s.eurRate != null ? String(s.eurRate) : "",
        usdRate: s.usdRate != null ? String(s.usdRate) : "",
        chfRate: s.chfRate != null ? String(s.chfRate) : "",
        gbpRate: s.gbpRate != null ? String(s.gbpRate) : "",
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Nuk u lexuan kurset.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const loadLive = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.frankfurter.dev/v2/rates?base=ALL&quotes=EUR,USD,CHF,GBP"
      );
      const data = await res.json();

      // frankfurter v2 kthen array me { quote, rate } ku rate = sa vlen
      // 1 ALL në monedhë të huaj; ne duam sa ALL vlen 1 njësi e huaj.
      const mapped = { EUR: null, USD: null, CHF: null, GBP: null };

      if (Array.isArray(data)) {
        for (const row of data) {
          if (!row?.quote || !row?.rate) continue;
          mapped[row.quote] = Number((1 / row.rate).toFixed(2));
        }
      }

      setLiveRates(mapped);
    } catch {
      // kursi live është vetëm ndihmës — s'e ndalim faqen
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadLive();
  }, [loadSettings, loadLive]);

  /* ---------- veprime ---------- */

  const setRate = (key, value) =>
    setRates((prev) => ({ ...prev, [key]: value }));

  const useLive = (currency) => {
    const live = liveRates[currency.code];
    if (live != null) setRate(currency.key, String(live));
  };

  const save = async () => {
    const payload = {};

    for (const c of CURRENCIES) {
      const raw = rates[c.key];
      if (raw === "") continue;

      const num = Number(raw);
      if (!Number.isFinite(num) || num <= 0) {
        setError(`Vendos kurs të vlefshëm për ${c.code}.`);
        return;
      }

      payload[c.key] = num;
    }

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      await api.patch(`/business/${businessId}/settings`, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      setError(e?.response?.data?.message || "Gabim gjatë ruajtjes.");
    } finally {
      setSaving(false);
    }
  };

  const diffOf = (currency) => {
    const manual = Number(rates[currency.key]);
    const live = liveRates[currency.code];

    if (!Number.isFinite(manual) || manual <= 0 || live == null) return null;

    return ((manual - live) / live) * 100;
  };

  /* ---------- render ---------- */

  return (
    <div className="kmb-page">
      {/* HERO */}
      <section className="kmb-hero">
        <h1>
          <DollarSign size={20} strokeWidth={2.4} />
          Këmbimi Valutor
        </h1>
        <p>Kursi manual i biznesit · baza ALL</p>
      </section>

      <div className="kmb-body">
        {error && <div className="kmb-error">{error}</div>}

        {loading ? (
          <div className="kmb-empty">Duke ngarkuar…</div>
        ) : (
          <>
            <ul className="kmb-list">
              {CURRENCIES.map((currency) => {
                const live = liveRates[currency.code];
                const diff = diffOf(currency);

                return (
                  <li key={currency.code} className="kmb-card">
                    <div className="kmb-card-top">
                      <span className="kmb-symbol">{currency.symbol}</span>

                      <span className="kmb-names">
                        <strong>{currency.code}</strong>
                        <em>{currency.label}</em>
                      </span>

                      {diff != null && (
                        <span
                          className={`kmb-diff ${
                            Math.abs(diff) < 1
                              ? "ok"
                              : diff > 0
                              ? "up"
                              : "down"
                          }`}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff.toFixed(1)}% vs tregu
                        </span>
                      )}
                    </div>

                    <div className="kmb-input-row">
                      <div className="kmb-input">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          placeholder="0.00"
                          value={rates[currency.key]}
                          onChange={(e) =>
                            setRate(currency.key, e.target.value)
                          }
                        />
                        <span>ALL</span>
                      </div>

                      {live != null && (
                        <button
                          type="button"
                          className="kmb-live"
                          onClick={() => useLive(currency)}
                          title="Përdor kursin e tregut"
                        >
                          <RefreshCw size={14} strokeWidth={2.4} />
                          {live.toFixed(2)}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              className={`kmb-save ${saved ? "done" : ""}`}
              onClick={save}
              disabled={saving}
            >
              {saved ? (
                <>
                  <Check size={18} strokeWidth={2.6} />
                  U ruajt
                </>
              ) : saving ? (
                "Duke ruajtur…"
              ) : (
                "Ruaj kurset"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}