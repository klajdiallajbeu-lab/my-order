import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPagePhone.css";

export default function LoginPagePhone({ onLogin }) {
  const navigate = useNavigate();

  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 120);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="phone-login-page">
      <div className="phone-bg-glow one" />
      <div className="phone-bg-glow two" />

      <header className={`phone-header ${loaded ? "show" : ""}`}>
  <button className="phone-brand phone-brand-center" type="button">
    <span className="phone-brand-mark" />
    <span>myOrder</span>
  </button>
</header>

      <main className={`phone-hero ${loaded ? "show" : ""}`}>
        <div className="phone-badge">Platformë për hotel, bar dhe restorant</div>

        <h1>
          Menaxho biznesin në një <span>platformë moderne</span>
        </h1>

        <p>
          QR menu, porosi live, produkte, staf dhe raporte të qarta në një
          sistem të vetëm.
        </p>

        <div className="phone-actions">
          <button
            className="phone-primary-btn"
            type="button"
            onClick={() => setShowLogin(true)}
          >
            Login
            <span></span>
          </button>

          <button
            className="phone-secondary-btn"
            type="button"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </button>
        </div>

        <section className="phone-dashboard">
          <div className="phone-dashboard-top">
            <span>Dashboard</span>
            <b>Live</b>
          </div>

          <div className="phone-main-card">
            <small>Porosi sot</small>
            <strong>148</strong>
            <div className="phone-chart">
              <span />
            </div>
          </div>

          <div className="phone-stats">
            <div>
              <small>Ushqime</small>
              <strong>62</strong>
              <span>▲ 12%</span>
            </div>

            <div>
              <small>Pije</small>
              <strong>86</strong>
              <span>▲ 8%</span>
            </div>
          </div>
        </section>

        <section className="phone-cards">
          <div className="phone-card">
            <span>QR</span>
            <strong>QR Menu</strong>
            <p>Porosi të menjëhershme nga klientët.</p>
          </div>

          <div className="phone-card">
            <span>PR</span>
            <strong>Produkte</strong>
            <p>Ushqime dhe pije të menaxhuara thjesht.</p>
          </div>

          <div className="phone-card">
            <span>RP</span>
            <strong>Raporte</strong>
            <p>Xhiro dhe statistika në kohë reale.</p>
          </div>
        </section>

        <section className="phone-contact">
          <span className="phone-contact-badge">Kontakt</span>

          <h2>Aktivizo biznesin tënd</h2>

          <p>
            Na shkruaj direkt ose dërgo kërkesën përmes formës së regjistrimit.
          </p>

          <a href="tel:+355678987445">+355 67 898 7445</a>
          <a href="mailto:klajdi.allajbeu12@gmail.com">
            klajdi.allajbeu12@gmail.com
          </a>

          <button type="button" onClick={() => navigate("/signup")}>
            Dërgo kërkesën
          </button>
        </section>
      </main>

      {showLogin && (
        <div className="phone-modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="phone-close"
              type="button"
              onClick={() => setShowLogin(false)}
            >
              ×
            </button>

            <span>Hyrje</span>
            <h3>Login</h3>
            <p>Vendos të dhënat për të hyrë në panel.</p>

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

              <button type="submit">Hyr në sistem</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}