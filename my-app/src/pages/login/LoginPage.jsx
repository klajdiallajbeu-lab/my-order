import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage({ onLogin }) {
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

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="premium-login-page">
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-grid" />

      <header className={`premium-header ${loaded ? "show" : ""}`}>
        <div className="premium-navbar">
          <button
            className="premium-brand"
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <span className="premium-brand-mark" />
            <span>myOrder</span>
          </button>

          <nav className="premium-nav">
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Kryesore
            </button>
            <button type="button" onClick={() => scrollToSection("funksione")}>
              Funksione
            </button>
            <button type="button" onClick={() => scrollToSection("produkte")}>
              Produkte
            </button>
            <button type="button" onClick={() => scrollToSection("raporte")}>
              Raporte
            </button>
            <button type="button" onClick={() => scrollToSection("kontakt")}>
              Kontakt
            </button>
          </nav>

          <div className="premium-header-actions">
            <button
              className="premium-login-ghost"
              type="button"
              onClick={() => setShowLogin(true)}
            >
              Log in
            </button>

            <button
              className="premium-login-top-btn"
              type="button"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <main className="premium-hero">
        <section className={`premium-left ${loaded ? "show" : ""}`}>
          <div className="premium-badge">
            Platformë moderne për hotel, bar dhe restorant
          </div>

          <h2 className="premium-title">
            Menaxho biznesin tënd në një{" "}
            <span>platformë moderne</span>
          </h2>

          <p className="premium-text">
            QR menu, porosi live, produkte, staf dhe raporte të qarta në një
            sistem të vetëm.
          </p>

          <div className="premium-actions">
            <button
              className="premium-primary-btn"
              type="button"
              onClick={() => setShowLogin(true)}
            >
              Hyr në sistem
              <span>→</span>
            </button>

            <button
              className="premium-secondary-btn"
              type="button"
              onClick={() => scrollToSection("funksione")}
            >
              Shiko demo
              <span>▷</span>
            </button>
          </div>

          <div className="premium-strip">
            <div className="premium-strip-item">
              <div className="strip-icon">QR</div>
              <strong>QR Menu</strong>
              <span>Porosi të menjëhershme nga klienti.</span>
            </div>

            <div className="premium-strip-item">
              <div className="strip-icon">PR</div>
              <strong>Produkte</strong>
              <span>Ushqime dhe pije të organizuara.</span>
            </div>

            <div className="premium-strip-item">
              <div className="strip-icon">RP</div>
              <strong>Raporte</strong>
              <span>Xhiro, fatura dhe statistika live.</span>
            </div>
          </div>
        </section>

        <section className={`premium-right ${loaded ? "show" : ""}`}>
          <div className="dashboard-mockup">
            <div className="mockup-top">
              <span className="mockup-pill">Dashboard</span>
              <span className="mockup-live">Live</span>
            </div>

            <div className="mockup-main-card">
              <div>
                <div className="mockup-label">Porosi sot</div>
                <div className="mockup-value">148</div>
              </div>

              <div className="mockup-chart">
                <span className="chart-line" />
              </div>
            </div>

            <div className="mockup-grid">
              <div className="mockup-small-card">
                <div>
                  <div className="mockup-label">Ushqime</div>
                  <div className="mockup-small-value">
                    62 <span>+12%</span>
                  </div>
                </div>
                <div className="mockup-card-icon">U</div>
              </div>

              <div className="mockup-small-card">
                <div>
                  <div className="mockup-label">Pije</div>
                  <div className="mockup-small-value">
                    86 <span>+8%</span>
                  </div>
                </div>
                <div className="mockup-card-icon purple">P</div>
              </div>
            </div>

            <div className="mockup-list-card">
              <div className="mockup-row">
                <span>Dhoma 204</span>
                <b className="status success">Konfirmuar</b>
              </div>
              <div className="mockup-row">
                <span>Tavolina 7</span>
                <b className="status warning">Në pritje</b>
              </div>
              <div className="mockup-row">
                <span>Porosi aktive</span>
                <b className="status blue">32</b>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="landing-section" id="funksione">
        <div className="section-head">
          <div className="section-badge">Funksione</div>
          <h3>Gjithçka që i duhet biznesit tënd në një platformë moderne</h3>
          <p>
            Organizim i thjeshtë për porosi, staf dhe vendet e shërbimit në një
            rrjedhë të vetme pune.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-box">
            <div className="feature-icon">QR</div>
            <h4>Porosi me QR</h4>
            <p>Klientët skanojnë kodin dhe porosisin direkt nga telefoni.</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon">Live</div>
            <h4>Menaxhim porosish</h4>
            <p>Porosi në kohë reale me status të qartë dhe dërgim të shpejtë.</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon">Staff</div>
            <h4>Menaxhim stafi</h4>
            <p>Role të ndara për admin, manager dhe kamarierë.</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon">Place</div>
            <h4>Dhoma, tavolina, çadra</h4>
            <p>Kontroll i plotë sipas vendit ku ndodhet klienti.</p>
          </div>
        </div>
      </section>

      <section className="landing-section" id="produkte">
        <div className="section-head">
          <div className="section-badge">Produkte</div>
          <h3>Menu e qartë dhe menaxhim i shpejtë i ushqimeve dhe pijeve</h3>
          <p>
            E ndërtuar për punë të përditshme, me fokus te thjeshtësia dhe
            kontrolli i plotë mbi menunë.
          </p>
        </div>

        <div className="product-grid">
          <div className="product-box">
            <span className="product-tag">Ushqime</span>
            <h4>Menaxhim ushqimesh</h4>
            <p>Shto, ndrysho ose çaktivizo produktet në pak sekonda.</p>
          </div>

          <div className="product-box">
            <span className="product-tag">Pije</span>
            <h4>Menaxhim pijesh</h4>
            <p>Mbaj menunë të përditësuar dhe të qartë për klientin.</p>
          </div>

          <div className="product-box">
            <span className="product-tag">Menu</span>
            <h4>Menu online</h4>
            <p>Klientët shohin menunë nga telefoni pa menu fizike.</p>
          </div>
        </div>
      </section>

      <section className="landing-section" id="raporte">
        <div className="section-head">
          <div className="section-badge">Raporte</div>
          <h3>Shiko xhiron, faturat dhe performancën e biznesit në çdo moment</h3>
          <p>
            Raporte të qarta për të kuptuar çfarë po ecën mirë dhe ku duhet më
            shumë kontroll.
          </p>
        </div>

        <div className="report-grid">
          <div className="report-box">
            <h4>Xhiro ditore</h4>
            <p>Shiko totalet sipas datës dhe monitoro performancën.</p>
          </div>

          <div className="report-box">
            <h4>Produktet më të shitura</h4>
            <p>Kupto cilat ushqime dhe pije performojnë më mirë.</p>
          </div>

          <div className="report-box">
            <h4>Fatura dhe historik</h4>
            <p>Ruaj, printo dhe kontrollo historikun e shitjeve.</p>
          </div>
        </div>
      </section>

      <section className="landing-section contact-section" id="kontakt">
        <div className="contact-card">
          <div className="contact-left">
            <div className="section-badge">Kontakt</div>

            <h3>Kontakto me ne për aktivizimin e biznesit</h3>

            <p>
              Mund të na shkruash direkt ose të dërgosh kërkesën përmes formës
              së regjistrimit.
            </p>
          </div>

          <div className="contact-info">

            <a
  href="mailto:support@myorder.com"
  className="contact-item"
>
  <span className="contact-icon">✉</span>

  <div>
    <strong>support@myorder.com</strong>
    <small>Email</small>
  </div>
</a>

            <a href="tel:+35567 75 09 879" className="contact-item">
              <span className="contact-icon">T</span>
              <div>
                <strong>+355 67 75 09 879</strong>
                <small>Telefon</small>
              </div>
            </a>
          </div>

          <button
            className="premium-primary-btn contact-main-btn"
            type="button"
            onClick={() => navigate("/signup")}
          >
            Dërgo kërkesën
            <span>→</span>
          </button>
        </div>
      </section>

      {showLogin && (
        <div className="login-overlay" onClick={() => setShowLogin(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-btn"
              type="button"
              onClick={() => setShowLogin(false)}
            >
              ×
            </button>

            <div className="login-modal-head">
              <div className="login-modal-badge">Hyrje</div>
              <h3>Hyr në sistem</h3>
              <p>Vendos të dhënat për të hyrë në panelin tënd.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
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

              <button type="submit" className="submit-btn">
                Hyr në sistem
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}