import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPagePhone.css";
import { Shield, FileText, Phone } from "lucide-react";

export default function LoginPagePhone({ onLogin }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [cookieAccepted, setCookieAccepted] = useState(
    () => localStorage.getItem("cookie_accepted") === "true"
  );

  const [turnstileToken, setTurnstileToken] = useState("");
const [turnstileError, setTurnstileError] = useState("");
const [submitting, setSubmitting] = useState(false);

const turnstileContainerRef = useRef(null);
const widgetIdRef = useRef(null);

const resetTurnstile = () => {
  setTurnstileToken("");

  if (window.turnstile && widgetIdRef.current !== null) {
    try {
      window.turnstile.reset(widgetIdRef.current);
    } catch {
      // widget mund të mos jetë gati për reset
    }
  }
};

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
  const renderTurnstile = () => {
    if (
      !window.turnstile ||
      !turnstileContainerRef.current ||
      widgetIdRef.current !== null
    ) {
      return;
    }

    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    if (!siteKey) {
      setTurnstileError("Site Key i Turnstile mungon.");
      return;
    }

    widgetIdRef.current = window.turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: siteKey,
        theme: "light",

        callback: (token) => {
          setTurnstileToken(token);
          setTurnstileError("");
        },

        "expired-callback": () => {
          setTurnstileToken("");
        },

        "error-callback": () => {
          setTurnstileToken("");
          setTurnstileError(
            "Kontrolli i sigurisë dështoi. Provo përsëri."
          );
        },
      }
    );
  };

  if (window.turnstile) {
    renderTurnstile();
    return;
  }

  const scriptUrl =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

  const existingScript = document.querySelector(
    `script[src="${scriptUrl}"]`
  );

  if (existingScript) {
    existingScript.addEventListener("load", renderTurnstile);

    return () => {
      existingScript.removeEventListener("load", renderTurnstile);
    };
  }

  const script = document.createElement("script");
  script.src = scriptUrl;
  script.async = true;
  script.defer = true;
  script.addEventListener("load", renderTurnstile);

  document.head.appendChild(script);

  return () => {
    script.removeEventListener("load", renderTurnstile);

    if (window.turnstile && widgetIdRef.current !== null) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Widget mund të jetë hequr më parë.
      }
    }
  };
}, []);

const handleSubmit = async (e) => {
  e.preventDefault();
  setTurnstileError("");

  if (!username.trim() || !password) {
    setTurnstileError("Plotëso përdoruesin dhe fjalëkalimin.");
    return;
  }

  if (!turnstileToken) {
    setTurnstileError("Përfundo kontrollin e sigurisë.");
    return;
  }

  // Mbron nga double-submit (double-tap), i cili do ta dërgonte të
  // njëjtin token turnstile dy herë dhe Cloudflare do ta refuzonte si
  // "duplicate" (token-at janë single-use).
  if (submitting) return;

  setSubmitting(true);

  try {
    await onLogin(username.trim(), password, turnstileToken);
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      "Hyrja dështoi. Kontrollo kredencialet dhe provo përsëri.";

    setTurnstileError(msg);

    // Token-i i Turnstile-it është single-use — pasi login-i dështoi,
    // duhet marrë një token i ri para riprovimit.
    resetTurnstile();
  } finally {
    setSubmitting(false);
  }
};

  const acceptCookies = () => {
    localStorage.setItem("cookie_accepted", "true");
    setCookieAccepted(true);
  };

  return (
    <div className="lpp-page">
      <main className={`lpp-main ${loaded ? "show" : ""}`}>
        <div className="lpp-logo-center">
          <div className="lpp-logo-name">
            my<span>Order</span>
          </div>
          <div className="lpp-logo-sub">Management Platform</div>
        </div>

        <div className="lpp-card">
          <form onSubmit={handleSubmit} className="lpp-form">
            <div className="lpp-field">
              <label htmlFor="phone-username">Përdoruesi</label>

              <div className="lpp-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>

                <input
                  id="phone-username"
                  type="text"
                  placeholder="Përdoruesi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="lpp-field">
              <label htmlFor="phone-password">Fjalëkalimi</label>

              <div className="lpp-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>

                <input
                  id="phone-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Fjalëkalimi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={submitting}
                />

                <button
                  type="button"
                  className="lpp-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <label className="lpp-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Më mbaj mend</span>
            </label>

            <div
  ref={turnstileContainerRef}
  className="lpp-turnstile"
/>

{turnstileError && (
  <div className="lpp-turnstile-error">
    {turnstileError}
  </div>
)}

            <button
  type="submit"
  className="lpp-submit"
  disabled={!turnstileToken || submitting}
>
              {submitting ? "Duke u kyçur..." : "Hyr"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            <div className="lpp-divider">
              <span>ose</span>
            </div>

            <button
              type="button"
              className="lpp-demo-btn"
              onClick={() => navigate("/signup")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              Regjistro biznesin tënd
            </button>
          </form>
        </div>
        <footer className="lpp-footer">
  <button type="button" onClick={() => navigate("/privacy")}>
    <Shield size={16} />
    <span>Politika e Privatësisë</span>
  </button>

  <button type="button" onClick={() => navigate("/terms")}>
    <FileText size={16} />
    <span>Kushtet e Përdorimit</span>
  </button>

  <button type="button" onClick={() => navigate("/contact")}>
    <Phone size={16} />
    <span>Na Kontaktoni</span>
  </button>
</footer>

        <div className="lpp-copyright">
          © 2026 myOrder · Të gjitha të drejtat e rezervuara
        </div>
      </main>

      {!cookieAccepted && (
        <div className="lpp-cookie">
          <div className="lpp-cookie-text">
            <strong>Cookie Policy</strong>
            <p>
              Ne përdorim cookies për funksionimin e platformës dhe ruajtjen e preferencave.
            </p>
          </div>

          <div className="lpp-cookie-actions">
            <button
              type="button"
              className="lpp-cookie-link"
              onClick={() => navigate("/privacy")}
            >
              Mëso më shumë
            </button>

            <button type="button" onClick={acceptCookies} className="lpp-cookie-btn">
              Pranoj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}