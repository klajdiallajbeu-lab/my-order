import { useState } from "react";
import "./LoginPage.css";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);  // Ky thërret funksionin në App.jsx
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Hyrja në Sistem 🔐</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Përdoruesi"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Fjalëkalimi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Hyr</button>
        </form>
      </div>
    </div>
  );
}


