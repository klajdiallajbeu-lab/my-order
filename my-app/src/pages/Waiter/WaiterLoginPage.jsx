// src/pages/Waiter/WaiterLoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WaiterPage.css"; // ose krijo WaiterLoginPage.css nëse do veçmas

export default function WaiterLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/waiters/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Kredencialet janë të pasakta");
        return;
      }

      // Ruajmë të dhënat e kamarjerit
      localStorage.setItem("waiterId", data.waiterId);
      localStorage.setItem("waiterName", data.name);
      localStorage.setItem("businessId", data.businessId);

      // Shkojmë te faqja kryesore e kamarjerit
      navigate("/waiter");
    } catch (err) {
      console.error(err);
      setError("Gabim serveri, provo përsëri më vonë");
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
          />
        </label>

        <label>
          Fjalëkalimi
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Shkruaj fjalëkalimin"
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="submit">Hyr</button>
      </form>
    </div>
  );
}
