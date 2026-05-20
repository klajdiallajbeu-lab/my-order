// src/pages/Waiter/WaiterLoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WaiterPage.css";

export default function WaiterLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      localStorage.removeItem("waiterId");
      localStorage.removeItem("waiterName");
      localStorage.removeItem("businessId");
      sessionStorage.removeItem("waiterId");
      sessionStorage.removeItem("waiterName");
      sessionStorage.removeItem("businessId");

      const res = await fetch("http://localhost:5000/api/waiters/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: String(username || "").trim(),
          password: String(password || "").trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("WAITER LOGIN DATA:", data);

      if (!res.ok) {
        setError(data?.message || "Kredencialet janë të pasakta");
        setLoading(false);
        return;
      }

      const waiterId = data?.waiterId || data?._id || data?.id || "";
      const waiterName = data?.name || data?.username || "Kamarjer";
      const businessId = data?.businessId || "";

      if (!waiterId) {
        setError("Backend nuk ktheu waiterId.");
        setLoading(false);
        return;
      }

      if (!businessId) {
        setError("Backend nuk ktheu businessId.");
        setLoading(false);
        return;
      }

      localStorage.setItem("waiterId", String(waiterId));
      localStorage.setItem("waiterName", String(waiterName));
      localStorage.setItem("businessId", String(businessId));

      sessionStorage.setItem("waiterId", String(waiterId));
      sessionStorage.setItem("waiterName", String(waiterName));
      sessionStorage.setItem("businessId", String(businessId));

      navigate("/waiter");
    } catch (err) {
      console.error("Waiter login error:", err);
      setError("Gabim serveri, provo përsëri më vonë");
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

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Duke hyrë..." : "Hyr"}
        </button>
      </form>
    </div>
  );
}