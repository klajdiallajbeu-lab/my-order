import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  PhoneIcon,
  ChartBarIcon,
  ArchiveBoxIcon,
  UsersIcon,
  PresentationChartLineIcon,
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import logo from "../../assets/logo.webp";
import "./LoginPage.css";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

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

  if (!token) {
    setTurnstileToken("");
    setTurnstileError("Turnstile nuk ktheu token.");
    return;
  }

  setTurnstileToken(token);
  setTurnstileError("");
},

          "expired-callback": () => {
            setTurnstileToken("");
          },

          "timeout-callback": () => {
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

    const scriptUrl =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

    if (window.turnstile) {
      renderTurnstile();
    } else {
      const existingScript = document.querySelector(
        `script[src="${scriptUrl}"]`
      );

      if (existingScript) {
        existingScript.addEventListener("load", renderTurnstile);
      } else {
        const script = document.createElement("script");

        script.src = scriptUrl;
        script.async = true;
        script.defer = true;
        script.addEventListener("load", renderTurnstile);

        document.head.appendChild(script);
      }
    }

    return () => {
      const existingScript = document.querySelector(
        `script[src="${scriptUrl}"]`
      );

      existingScript?.removeEventListener("load", renderTurnstile);

      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget-i mund të jetë hequr më parë.
        }
      }

      widgetIdRef.current = null;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTurnstileError("");

    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setTurnstileError("Plotëso përdoruesin dhe fjalëkalimin.");
      return;
    }

    if (!turnstileToken) {
      setTurnstileError("Përfundo kontrollin e sigurisë.");
      return;
    }

    // Mbron nga double-submit (double-click/double-tap), i cili do të
    // dërgonte të njëjtin token turnstile dy herë dhe do ta bënte
    // Cloudflare-in ta refuzojë si "duplicate" (token-at janë single-use).
    if (submitting) return;

    setSubmitting(true);

    try {
      await onLogin(cleanUsername, password, turnstileToken);
      // Nëse onLogin ka sukses, faqja navigon larg — s'ka nevojë të
      // rivendosim submitting këtu.
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Hyrja dështoi. Kontrollo kredencialet dhe provo përsëri.";

      setTurnstileError(msg);

      // Token-i i Turnstile-it është single-use — pasi login-i dështoi,
      // duhet marrë një token i ri para riprovimit, përndryshe
      // Cloudflare kthen "timeout-or-duplicate".
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="myorder-page">
      <header className="myorder-topbar">
        <div className="myorder-brand">
          <img src={logo} alt="myOrder" className="myorder-logo" />
          <span className="myorder-brand-sub">Management Platform</span>
        </div>

        <nav className="myorder-toplinks">
          <button type="button" onClick={() => navigate("/privacy")}>
            <ShieldCheckIcon className="toplink-icon" />
            Politika e Privatësisë

          </button>

          <button type="button" onClick={() => navigate("/terms")}>
            <DocumentTextIcon className="toplink-icon" />
            Kushtet e Përdorimit
          </button>

          <button type="button" onClick={() => navigate("/contact")}>
            <PhoneIcon className="toplink-icon" />
            Na Kontaktoni
          </button>
        </nav>
      </header>

      <main className="myorder-main">
        <div className="myorder-card">
          <section className="myorder-left">
            <div className="myorder-left-content">
              <h1 className="myorder-title">
                Menaxho biznesin tënd
                <br />
                <span>më thjeshtë se kurrë!</span>
              </h1>

              <p className="myorder-subtitle">
                myOrder ju ndihmon të menaxhoni porositë, inventarin, stafin
                dhe raportet në një platformë të vetme.
              </p>

              <ul className="myorder-features">
                <li>
                  <span className="feature-icon">
                    <ChartBarIcon />
                  </span>
                  <div>
                    <strong>Rrit efikasitetin</strong>
                    <span>Monitoro performancën në kohë reale</span>
                  </div>
                </li>

                <li>
                  <span className="feature-icon">
                    <ArchiveBoxIcon />
                  </span>
                  <div>
                    <strong>Menaxho inventarin</strong>
                    <span>Kontrollo produktet dhe stokun lehtësisht</span>
                  </div>
                </li>

                <li>
                  <span className="feature-icon">
                    <UsersIcon />
                  </span>
                  <div>
                    <strong>Menaxho stafin</strong>
                    <span>Organizo rolet dhe përgjegjësitë</span>
                  </div>
                </li>

                <li>
                  <span className="feature-icon">
                    <PresentationChartLineIcon />
                  </span>
                  <div>
                    <strong>Raporte të avancuara</strong>
                    <span>Vendime më të mira me të dhëna të sakta</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="myorder-illustration" aria-hidden="true">
              <svg viewBox="0 0 320 300" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor="#3b82f6" />
                    <stop offset="1" stopColor="#7fb2ff" />
                  </linearGradient>
                  <filter id="cardShadow" x="-60%" y="-60%" width="220%" height="220%">
                    <feDropShadow
                      dx="0"
                      dy="12"
                      stdDeviation="14"
                      floodColor="#1d4ed8"
                      floodOpacity="0.16"
                    />
                  </filter>
                </defs>

                <g filter="url(#cardShadow)">
                  <rect x="98" y="18" width="200" height="182" rx="22" fill="#ffffff" />
                </g>

                <rect x="124" y="108" width="18" height="62" rx="6" fill="url(#barGrad)" />
                <rect x="152" y="76" width="18" height="94" rx="6" fill="url(#barGrad)" />
                <rect x="180" y="96" width="18" height="74" rx="6" fill="url(#barGrad)" />

                <g transform="translate(150, 60)">
                  <circle r="24" fill="#e2e8f0" />
                  <path d="M0 0 L0 -24 A24 24 0 0 1 20.8 -12 Z" fill="#2563eb" />
                  <path d="M0 0 L20.8 -12 A24 24 0 0 1 5.6 23.4 Z" fill="#f472b6" />
                </g>

                <g filter="url(#cardShadow)">
                  <circle cx="264" cy="150" r="22" fill="#ffffff" />
                </g>

                <path
                  d="M254 156 L262 144 L270 152 L280 136"
                  stroke="#2563eb"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <rect x="118" y="204" width="164" height="16" rx="8" fill="#ffffff" opacity="0.9" />
                <rect x="176" y="220" width="48" height="16" rx="8" fill="#2563eb" opacity="0.9" />
              </svg>
            </div>
          </section>

          <section className="myorder-right">
            <div className="lpp-card">
              <h1>LOGIN</h1>
              

              <form className="lpp-form" onSubmit={handleSubmit}>
                <div className="lpp-field">
                  <label htmlFor="username">Përdoruesi</label>
                  <div className="lpp-input-wrap">
                    <UserIcon />
                    <input
                      id="username"
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
                  <label htmlFor="password">Fjalëkalimi</label>
                  <div className="lpp-input-wrap">
                    <LockClosedIcon />
                    <input
                      id="password"
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
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={
                        showPassword ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"
                      }
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div className="lpp-remember-row">
                  <label className="lpp-remember">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Më mbaj mend
                  </label>
                  <button
   type="button"
   className="lpp-forgot-link"
   onClick={() => navigate("/forgot-password")}
>
   Keni harruar fjalëkalimin?
</button>
                </div>


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
                  <ArrowRightIcon />
                </button>

                <div className="lpp-divider">
                  <span>ose</span>
                </div>

                <button
                  type="button"
                  className="lpp-demo-btn"
                  onClick={() => navigate("/signup")}
                >
                  <UserPlusIcon />
                  Regjistro biznesin tënd
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>

      <footer className="myorder-footer">
        <nav className="myorder-footer-links">
          <button type="button" onClick={() => navigate("/privacy")}>
            Politika e Privatësisë
          </button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/terms")}>
            Kushtet e Përdorimit
          </button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/contact")}>
            Na Kontaktoni
          </button>
        </nav>

        <div className="myorder-copyright">
          © 2026 myOrder. Të gjitha të drejtat e rezervuara.
        </div>
      </footer>
    </div>
  );
}