import { useState } from "react";
import "./AdminLoginPage.css";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Kredenciale të pasakta");
        return;
      }

      localStorage.setItem("adminId", data.adminId);
      window.location.href = "/admin/dashboard";
    } catch (err) {
      setError("Gabim serveri!");
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
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="login-error">{error}</div>}

        <button onClick={handleLogin}>Hyr si Admin</button>
      </div>
    </div>
  );
}
