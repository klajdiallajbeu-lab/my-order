import { useEffect, useRef, useState } from "react";
import "./AdminLoginPage.css";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const turnstileContainerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    const renderTurnstile = () => {
      if (
        !window.turnstile ||
        !turnstileContainerRef.current ||
        widgetIdRef.current !== null
      ) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(
        turnstileContainerRef.current,
        {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          theme: "light",

          callback: (token) => {
            setTurnstileToken(token);
            setError("");
          },

          "expired-callback": () => {
            setTurnstileToken("");
          },

          "error-callback": () => {
            setTurnstileToken("");
            setError("Kontrolli i sigurisë dështoi. Provo përsëri.");
          },
        }
      );
    };

    if (window.turnstile) {
      renderTurnstile();
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", renderTurnstile);
      return () => {
        existingScript.removeEventListener("load", renderTurnstile);
      };
    }

    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
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
          // Widget mund të jetë hequr tashmë.
        }
      }
    };
  }, []);

  const resetTurnstile = () => {
    setTurnstileToken("");

    if (window.turnstile && widgetIdRef.current !== null) {
      window.turnstile.reset(widgetIdRef.current);
    }
  };

  const handleLogin = async () => {
    setError("");

    if (!username.trim() || !password) {
      setError("Plotëso username dhe password.");
      return;
    }

    if (!turnstileToken) {
      setError("Përfundo kontrollin e sigurisë.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/admin/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    username: username.trim(),
    password,
    turnstileToken,
  }),
});

const contentType = res.headers.get("content-type") || "";

if (!contentType.includes("application/json")) {
  const text = await res.text();
  console.error("Përgjigje jo-JSON:", text.slice(0, 300));

  setError("Serveri ktheu një përgjigje të pasaktë.");
  resetTurnstile();
  return;
}

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Kredenciale të pasakta");
        resetTurnstile();
        return;
      }

      localStorage.setItem("adminId", data.adminId);
      localStorage.setItem("adminToken", data.token);

      window.location.href = "/admin/dashboard";
    } catch (err) {
      console.error("Gabim te admin login:", err);
      setError("Gabim serveri!");
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !submitting) {
      handleLogin();
    }
  };

  return (
    <div className="admin-login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🔐</div>
          <h1>Admin Login</h1>
          <p>Hyr për të menaxhuar sistemin</p>
        </div>

        <input
          type="text"
          placeholder="Username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div
          ref={turnstileContainerRef}
          className="admin-turnstile-container"
        />

        {error && <div className="login-error">{error}</div>}

        <button
          type="button"
          onClick={handleLogin}
          disabled={submitting || !turnstileToken}
        >
          {submitting ? "Duke hyrë..." : "Hyr si Admin"}
        </button>
      </div>
    </div>
  );
}