import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PolicyPages.css";

export default function ContactPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="policy-page">
      <header className="policy-header">
        <button type="button" className="policy-back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Kthehu
        </button>
        <div className="policy-logo">my<span>Order</span></div>
      </header>

      <main className="policy-main">
        <div className="policy-card">
          <h1>Na Kontaktoni</h1>
          <p className="policy-date">Jemi këtu për t'ju ndihmuar</p>

          <div className="policy-body">

            <div className="contact-info-grid">
              <div className="contact-info-card">
                <div className="contact-info-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <strong>Email</strong>
                  <a href="mailto:info.myorderal@gmail.com">info.myorderal@gmail.com</a>
                </div>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6.55 6.55l1.63-1.63a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div>
                  <strong>Telefon</strong>
                  <a href="tel:+355677509879">+355 67 750 9879</a>
                </div>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <div>
                  <strong>Website</strong>
                  <a href="https://www.myorderal.com" target="_blank" rel="noreferrer">www.myorderal.com</a>
                </div>
              </div>
            </div>

            <div className="contact-divider">ose dërgoni mesazh</div>

            {sent ? (
              <div className="contact-success">
                ✓ Mesazhi u dërgua! Do t'ju kontaktojmë së shpejti.
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="sp-field">
                  <label>Emri juaj</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Emri dhe mbiemri" required />
                </div>
                <div className="sp-field">
                  <label>Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@juaj.com" required />
                </div>
                <div className="sp-field">
                  <label>Mesazhi</label>
                  <textarea name="message" value={form.message} onChange={handleChange} placeholder="Si mund t'ju ndihmojmë?" rows="4" required />
                </div>
                <button type="submit" className="sp-submit">
                  Dërgo mesazhin
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}