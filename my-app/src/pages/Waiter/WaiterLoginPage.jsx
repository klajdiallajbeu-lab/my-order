import "../../qz-signing";
// src/pages/Waiter/WaiterLoginPage.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { refreshSocketAuth } from "../../realtime/socket.js";
import "./WaiterPage.css";

export default function WaiterLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState("");

  const turnstileContainerRef = useRef(null);
  const widgetIdRef = useRef(null);

  const navigate = useNavigate();

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

  const resetTurnstile = () => {
    setTurnstileToken("");

    if (window.turnstile && widgetIdRef.current !== null) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // Reset mund të dështojë nëse widget-i është hequr.
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setTurnstileError("");

    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "").trim();

    if (!cleanUsername || !cleanPassword) {
      setError("Plotëso username dhe fjalëkalimin.");
      return;
    }

    if (!turnstileToken) {
      setTurnstileError("Përfundo kontrollin e sigurisë.");
      return;
    }

    setLoading(true);

    try {
      localStorage.removeItem("waiterId");
      localStorage.removeItem("waiterName");
      localStorage.removeItem("businessId");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      localStorage.removeItem("role");
      localStorage.removeItem("token");

      sessionStorage.removeItem("waiterId");
      sessionStorage.removeItem("waiterName");
      sessionStorage.removeItem("businessId");
      sessionStorage.removeItem("userId");
      sessionStorage.removeItem("userName");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("token");

      const res = await fetch("/api/waiters/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
          turnstileToken,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await res.text();

        console.error(
          "Përgjigje jo-JSON nga waiter login:",
          text.slice(0, 300)
        );

        setError("Serveri ktheu një përgjigje të pasaktë.");
        resetTurnstile();
        return;
      }

      const data = await res.json();

      console.log("WAITER LOGIN DATA:", data);

      if (!res.ok) {
        setError(data?.message || "Kredencialet janë të pasakta");
        resetTurnstile();
        return;
      }

      const waiterId = data?.waiterId || data?._id || data?.id || "";

      const waiterName =
        `${data?.name || ""} ${data?.surname || ""}`.trim() ||
        data?.waiterName ||
        data?.username ||
        "Kamarjer";

      const businessId = data?.businessId || "";
      const token = data?.token || "";

      if (!waiterId) {
        setError("Backend nuk ktheu waiterId.");
        resetTurnstile();
        return;
      }

      if (!businessId) {
        setError("Backend nuk ktheu businessId.");
        resetTurnstile();
        return;
      }

      if (!token) {
        setError("Backend nuk ktheu token.");
        resetTurnstile();
        return;
      }

      localStorage.setItem("waiterId", String(waiterId));
      localStorage.setItem("waiterName", String(waiterName));
      localStorage.setItem("businessId", String(businessId));
      localStorage.setItem("userId", String(waiterId));
      localStorage.setItem("userName", String(waiterName));
      localStorage.setItem("role", "waiter");
      localStorage.setItem("token", String(token));

      sessionStorage.setItem("waiterId", String(waiterId));
      sessionStorage.setItem("waiterName", String(waiterName));
      sessionStorage.setItem("businessId", String(businessId));
      sessionStorage.setItem("userId", String(waiterId));
      sessionStorage.setItem("userName", String(waiterName));
      sessionStorage.setItem("role", "waiter");
      sessionStorage.setItem("token", String(token));

      // Rilidh socket-in me token-in e ri => room-i privat i biznesit.
      refreshSocketAuth();

      navigate("/waiter");
    } catch (err) {
      console.error("Waiter login error:", err);
      setError("Gabim serveri, provo përsëri më vonë.");
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="waiter-login-container">
      <h2>Hyrje për Kamarjer</h2>

      <form onSubmit={handleLogin} className="waiter-login-form">
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Shkruaj username"
            autoComplete="username"
          />
        </label>

        <label>
          Fjalëkalimi
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Shkruaj fjalëkalimin"
            autoComplete="current-password"
          />
        </label>

        <div
          ref={turnstileContainerRef}
          className="waiter-turnstile"
        />

        {turnstileError && (
          <p className="error-text">{turnstileError}</p>
        )}

        {error && <p className="error-text">{error}</p>}

        <button
          type="submit"
          disabled={loading || !turnstileToken}
        >
          {loading ? "Duke hyrë..." : "Hyr"}
        </button>
      </form>
    </div>
  );
}